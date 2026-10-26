/**
 * The one WebGL2 context every Fluid aura shares.
 *
 * Browsers cap live WebGL contexts (about 16, Foundry's board included) and
 * drop the oldest past that, so auras never get a context of their own. Each
 * aura keeps its simulation in this context's textures; the renderer steps it,
 * draws it on its own offscreen canvas, and hands that frame to the aura's
 * canvas beside the sheet as an ImageBitmap. The hand-off moves the GPU
 * buffer instead of copying it; drawing the WebGL canvas into a 2D canvas
 * measured several times slower.
 *
 * Simulation adapted from the standalone "Ficha em Chamas" prototype.
 */

const VERTEX_SHADER = `#version 300 es
in vec2 aPos;uniform vec2 texel;out vec2 vUv,vL,vR,vT,vB;
void main(){vUv=aPos*.5+.5;vL=vUv-vec2(texel.x,0.);vR=vUv+vec2(texel.x,0.);vT=vUv+vec2(0.,texel.y);vB=vUv-vec2(0.,texel.y);gl_Position=vec4(aPos,0.,1.);}`;

const FRAGMENT_HEADER = `#version 300 es
precision highp float;precision highp sampler2D;in vec2 vUv,vL,vR,vT,vB;out vec4 o;`;

const FRAGMENT_SHADERS = Object.freeze({
  // Adds dye (target 0) or outward velocity (target 1) in a noisy band along
  // the host's rounded rectangle.
  source: `uniform sampler2D uT;uniform vec2 rc,rs;uniform float aspect,crad,band,time,rate,outF,dt;uniform vec3 tint;uniform int target;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
float sd(vec2 p){vec2 b=rs;b.x*=aspect;vec2 q=abs(p)-b+crad;return length(max(q,0.))+min(max(q.x,q.y),0.)-crad;}
void main(){vec2 p=vUv-rc;p.x*=aspect;float d=sd(p);
float m=exp(-(d*d)/(band*band))*smoothstep(-band*2.5,-band*.2,d);
float n=.6*vn(p*7.+vec2(0.,-time*2.2))+.4*vn(p*15.+vec2(time*.8,-time*3.4));
float f=smoothstep(.35,.85,n)*m;vec4 c=texture(uT,vUv);
if(target==0){o=vec4(c.rgb+tint*f*rate*dt,1.);}
else{float e=.002;vec2 g=vec2(sd(p+vec2(e,0.))-sd(p-vec2(e,0.)),sd(p+vec2(0.,e))-sd(p-vec2(0.,e)));g=normalize(g+1e-6);
o=vec4(c.xy+g*outF*f*dt*rate,0.,1.);}}`,
  advect: `uniform sampler2D uVel,uSrc;uniform vec2 vt;uniform float dt,diss;
void main(){vec2 c=vUv-dt*texture(uVel,vUv).xy*vt;o=texture(uSrc,c)/(1.+diss*dt);}`,
  divergence: `uniform sampler2D uVel;
void main(){vec2 C=texture(uVel,vUv).xy;float L=texture(uVel,vL).x,R=texture(uVel,vR).x,T=texture(uVel,vT).y,B=texture(uVel,vB).y;
if(vL.x<0.)L=-C.x;if(vR.x>1.)R=-C.x;if(vT.y>1.)T=-C.y;if(vB.y<0.)B=-C.y;o=vec4(.5*(R-L+T-B),0.,0.,1.);}`,
  curl: `uniform sampler2D uVel;
void main(){o=vec4(.5*(texture(uVel,vR).y-texture(uVel,vL).y-texture(uVel,vT).x+texture(uVel,vB).x),0.,0.,1.);}`,
  vorticity: `uniform sampler2D uVel,uCurl;uniform float curl,dt;
void main(){float L=texture(uCurl,vL).x,R=texture(uCurl,vR).x,T=texture(uCurl,vT).x,B=texture(uCurl,vB).x,C=texture(uCurl,vUv).x;
vec2 f=.5*vec2(abs(T)-abs(B),abs(R)-abs(L));f/=length(f)+1e-4;f*=curl*C;f.y*=-1.;
vec2 v=texture(uVel,vUv).xy+f*dt;o=vec4(clamp(v,-700.,700.),0.,1.);}`,
  pressure: `uniform sampler2D uP,uDiv;
void main(){o=vec4((texture(uP,vL).x+texture(uP,vR).x+texture(uP,vT).x+texture(uP,vB).x-texture(uDiv,vUv).x)*.25,0.,0.,1.);}`,
  gradient: `uniform sampler2D uP,uVel;
void main(){o=vec4(texture(uVel,vUv).xy-.5*vec2(texture(uP,vR).x-texture(uP,vL).x,texture(uP,vT).x-texture(uP,vB).x),0.,1.);}`,
  scale: `uniform sampler2D uT;uniform float v;void main(){o=v*texture(uT,vUv);}`,
  // Tone-mapped dye, premultiplied: alpha is the brightest channel.
  display: `uniform sampler2D uDye;
void main(){vec3 d=texture(uDye,vUv).rgb;vec3 c=min(1.25*d/(1.+d*.7),vec3(1.));o=vec4(c,max(c.r,max(c.g,c.b)));}`,
});

const SOURCE_BAND = 0.028;
const CURL_STRENGTH = 24;
const VELOCITY_DISSIPATION = 0.6;
const PRESSURE_DECAY = 0.8;

export class FluidRenderer {
  #canvas;
  #gl;
  #programs = {};
  #parallelCompile = null;
  #pendingPrograms = null;

  /**
   * A renderer, or null where WebGL2 float render targets are unavailable.
   * Its shaders may still be compiling: check `ready` before drawing.
   */
  static create() {
    const canvas = new OffscreenCanvas(1, 1);
    const gl = canvas.getContext("webgl2", {
      alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power",
    });
    if (!gl?.getExtension("EXT_color_buffer_float")) {
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
      return null;
    }
    const renderer = new FluidRenderer(canvas, gl);
    renderer.#startCompile();
    return renderer;
  }

  constructor(canvas, gl) {
    this.#canvas = canvas;
    this.#gl = gl;
  }

  get lost() {
    return !this.#gl || this.#gl.isContextLost();
  }

  /**
   * False while the driver still builds the shaders in the background
   * (KHR_parallel_shader_compile), so opening a sheet never blocks on it.
   * Without the extension the first read waits for the build. Throws when
   * a shader failed to build.
   */
  get ready() {
    if (!this.#pendingPrograms) return true;
    const gl = this.#gl;
    const status = this.#parallelCompile?.COMPLETION_STATUS_KHR;
    if (status && !this.#pendingPrograms.every(({ program }) => gl.getProgramParameter(program, status))) return false;
    this.#finishCompile();
    return true;
  }

  /** Textures for one aura: velocity and pressure on the coarse grid, dye on the fine one. */
  createSimulation([simWidth, simHeight], [dyeWidth, dyeHeight]) {
    return {
      velocity: this.#doubleTarget(simWidth, simHeight),
      dye: this.#doubleTarget(dyeWidth, dyeHeight),
      pressure: this.#doubleTarget(simWidth, simHeight),
      divergence: this.#target(simWidth, simHeight),
      curl: this.#target(simWidth, simHeight),
    };
  }

  freeSimulation(simulation) {
    const gl = this.#gl;
    if (!gl || !simulation) return;
    for (const target of simulationTargets(simulation)) {
      gl.deleteTexture(target.texture);
      gl.deleteFramebuffer(target.framebuffer);
    }
  }

  clearSimulation(simulation) {
    const gl = this.#gl;
    gl.clearColor(0, 0, 0, 1);
    for (const target of [simulation.dye.read, simulation.dye.write, simulation.velocity.read, simulation.velocity.write]) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
  }

  /**
   * Advances one aura by dt seconds.
   * @param {object} simulation - from createSimulation
   * @param {object} frame - dt, time, iterations, intensity, tint, outward,
   *   dissipation, and the host's shape in canvas UV: center, halfSize,
   *   aspect, cornerRadius.
   */
  step(simulation, frame) {
    const gl = this.#gl;
    const { velocity, dye, pressure } = simulation;
    const { dt } = frame;
    const velocityTexel = [1 / velocity.read.width, 1 / velocity.read.height];

    this.#addSource(dye, frame, 0, frame.intensity * 1.6);
    this.#addSource(velocity, frame, 1, frame.intensity * 2);

    let u = this.#use("curl");
    gl.uniform1i(u.uVel, this.#bind(0, velocity.read));
    this.#draw(simulation.curl, u);

    u = this.#use("vorticity");
    gl.uniform1i(u.uVel, this.#bind(0, velocity.read));
    gl.uniform1i(u.uCurl, this.#bind(1, simulation.curl));
    gl.uniform1f(u.curl, CURL_STRENGTH);
    gl.uniform1f(u.dt, dt);
    this.#draw(velocity.write, u);
    velocity.swap();

    u = this.#use("divergence");
    gl.uniform1i(u.uVel, this.#bind(0, velocity.read));
    this.#draw(simulation.divergence, u);

    u = this.#use("scale");
    gl.uniform1i(u.uT, this.#bind(0, pressure.read));
    gl.uniform1f(u.v, PRESSURE_DECAY);
    this.#draw(pressure.write, u);
    pressure.swap();

    u = this.#use("pressure");
    gl.uniform1i(u.uDiv, this.#bind(1, simulation.divergence));
    for (let i = 0; i < frame.iterations; i++) {
      gl.uniform1i(u.uP, this.#bind(0, pressure.read));
      this.#draw(pressure.write, u);
      pressure.swap();
    }

    u = this.#use("gradient");
    gl.uniform1i(u.uP, this.#bind(0, pressure.read));
    gl.uniform1i(u.uVel, this.#bind(1, velocity.read));
    this.#draw(velocity.write, u);
    velocity.swap();

    u = this.#use("advect");
    gl.uniform2f(u.vt, velocityTexel[0], velocityTexel[1]);
    gl.uniform1f(u.dt, dt);
    gl.uniform1i(u.uVel, this.#bind(0, velocity.read));
    gl.uniform1i(u.uSrc, this.#bind(0, velocity.read));
    gl.uniform1f(u.diss, VELOCITY_DISSIPATION);
    this.#draw(velocity.write, u);
    velocity.swap();

    gl.uniform1i(u.uVel, this.#bind(0, velocity.read));
    gl.uniform1i(u.uSrc, this.#bind(1, dye.read));
    gl.uniform1f(u.diss, frame.dissipation);
    this.#draw(dye.write, u);
    dye.swap();
  }

  /**
   * Draws the dye at its own resolution and hands the frame to the aura's
   * "bitmaprenderer" context. The offscreen canvas only resizes when auras
   * of different shapes take turns; same-sized sheets share one size.
   */
  present(simulation, context) {
    const gl = this.#gl;
    const { width, height } = simulation.dye.read;
    if (this.#canvas.width !== width) this.#canvas.width = width;
    if (this.#canvas.height !== height) this.#canvas.height = height;

    const u = this.#use("display");
    gl.uniform1i(u.uDye, this.#bind(0, simulation.dye.read));
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
    gl.uniform2f(u.texel, 1 / width, 1 / height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    context.transferFromImageBitmap(this.#canvas.transferToImageBitmap());
  }

  destroy() {
    this.#gl?.getExtension("WEBGL_lose_context")?.loseContext();
    this.#gl = null;
    this.#canvas = null;
  }

  #addSource(field, frame, target, rate) {
    const gl = this.#gl;
    const u = this.#use("source");
    gl.uniform1i(u.uT, this.#bind(0, field.read));
    gl.uniform2f(u.rc, frame.center[0], frame.center[1]);
    gl.uniform2f(u.rs, frame.halfSize[0], frame.halfSize[1]);
    gl.uniform1f(u.aspect, frame.aspect);
    gl.uniform1f(u.crad, frame.cornerRadius);
    gl.uniform1f(u.band, SOURCE_BAND);
    gl.uniform1f(u.time, frame.time);
    gl.uniform1f(u.dt, frame.dt);
    gl.uniform1f(u.rate, rate);
    gl.uniform1f(u.outF, frame.outward);
    gl.uniform3f(u.tint, frame.tint[0], frame.tint[1], frame.tint[2]);
    gl.uniform1i(u.target, target);
    this.#draw(field.write, u);
    field.swap();
  }

  // Status checks block until the driver is done, so they wait for `ready`.
  #startCompile() {
    const gl = this.#gl;
    this.#parallelCompile = gl.getExtension("KHR_parallel_shader_compile");
    const compileShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };
    const vertexShader = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    this.#pendingPrograms = Object.entries(FRAGMENT_SHADERS).map(([name, source]) => {
      const fragmentShader = compileShader(gl.FRAGMENT_SHADER, FRAGMENT_HEADER + source);
      const program = gl.createProgram();
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.bindAttribLocation(program, 0, "aPos");
      gl.linkProgram(program);
      return { name, program, shaders: [vertexShader, fragmentShader] };
    });

    // One full-screen quad serves every pass.
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
  }

  #finishCompile() {
    const gl = this.#gl;
    const pending = this.#pendingPrograms;
    this.#pendingPrograms = null;
    for (const { name, program, shaders } of pending) {
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const shaderLog = shaders.map((shader) => gl.getShaderInfoLog(shader)).filter(Boolean).join("\n");
        throw new Error(`Fluid aura shader "${name}" failed: ${shaderLog || gl.getProgramInfoLog(program)}`);
      }
      const uniforms = {};
      const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < count; i++) {
        const uniformName = gl.getActiveUniform(program, i).name;
        uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
      }
      this.#programs[name] = { program, uniforms };
    }
  }

  #target(width, height) {
    const gl = this.#gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { texture, framebuffer, width, height };
  }

  #doubleTarget(width, height) {
    return {
      read: this.#target(width, height),
      write: this.#target(width, height),
      swap() { [this.read, this.write] = [this.write, this.read]; },
    };
  }

  #use(name) {
    const { program, uniforms } = this.#programs[name];
    this.#gl.useProgram(program);
    return uniforms;
  }

  #bind(unit, target) {
    const gl = this.#gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, target.texture);
    return unit;
  }

  #draw(target, uniforms) {
    const gl = this.#gl;
    gl.viewport(0, 0, target.width, target.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    gl.uniform2f(uniforms.texel, 1 / target.width, 1 / target.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

function simulationTargets({ velocity, dye, pressure, divergence, curl }) {
  return [velocity.read, velocity.write, dye.read, dye.write, pressure.read, pressure.write, divergence, curl];
}
