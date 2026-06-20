'use client';

import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';

const vertexShader = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform float iTime;
uniform vec3 iResolution;
uniform vec3 uColor;
uniform float uAmplitude;
uniform float uDistance;
uniform vec2 uMouse;

#define PI 3.1415926538

const int u_line_count = 40;
const float u_line_width = 7.0;
const float u_line_blur = 10.0;

float Perlin2D(vec2 P) {
  vec2 Pi = floor(P);
  vec4 Pf_Pfmin1 = P.xyxy - vec4(Pi, Pi + 1.0);
  vec4 Pt = vec4(Pi.xy, Pi.xy + 1.0);
  Pt = Pt - floor(Pt * (1.0 / 71.0)) * 71.0;
  Pt += vec2(26.0, 161.0).xyxy;
  Pt *= Pt;
  Pt = Pt.xzxz * Pt.yyww;
  vec4 hash_x = fract(Pt * (1.0 / 951.135664));
  vec4 hash_y = fract(Pt * (1.0 / 642.949883));
  vec4 grad_x = hash_x - 0.49999;
  vec4 grad_y = hash_y - 0.49999;
  vec4 grad_results = inversesqrt(grad_x * grad_x + grad_y * grad_y) * (grad_x * Pf_Pfmin1.xzxz + grad_y * Pf_Pfmin1.yyww);
  grad_results *= 1.4142135623730950;
  vec2 blend = Pf_Pfmin1.xy * Pf_Pfmin1.xy * Pf_Pfmin1.xy * (Pf_Pfmin1.xy * (Pf_Pfmin1.xy * 6.0 - 15.0) + 10.0);
  vec4 blend2 = vec4(blend, vec2(1.0 - blend));
  return dot(grad_results, blend2.zxzx * blend2.wwyy);
}

float pixel(float count, vec2 resolution) {
  return (1.0 / max(resolution.x, resolution.y)) * count;
}

float lineFn(vec2 st, float width, float perc, float offset, vec2 mouse, float time, float amplitude, float distance) {
  float split_offset = (perc * 0.4);
  float split_point = 0.1 + split_offset;

  float amplitude_normal = smoothstep(split_point, 0.7, st.x);
  float amplitude_strength = 0.5;
  float finalAmplitude = amplitude_normal * amplitude_strength * amplitude * (1.0 + (mouse.y - 0.5) * 0.2);

  float time_scaled = time / 10.0 + (mouse.x - 0.5) * 1.0;
  float blur = smoothstep(split_point, split_point + 0.05, st.x) * perc;

  float xnoise = mix(
    Perlin2D(vec2(time_scaled, st.x + perc) * 2.5),
    Perlin2D(vec2(time_scaled, st.x + time_scaled) * 3.5) / 1.5,
    st.x * 0.3
  );

  float y = 0.5 + (perc - 0.5) * distance + xnoise / 2.0 * finalAmplitude;

  float line_start = smoothstep(
    y + (width / 2.0) + (u_line_blur * pixel(1.0, iResolution.xy) * blur),
    y,
    st.y
  );

  float line_end = smoothstep(
    y,
    y - (width / 2.0) - (u_line_blur * pixel(1.0, iResolution.xy) * blur),
    st.y
  );

  return clamp((line_start - line_end) * (1.0 - smoothstep(0.0, 1.0, pow(perc, 0.3))), 0.0, 1.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;

  float line_strength = 1.0;
  for (int i = 0; i < u_line_count; i++) {
    line_strength *= (1.0 - lineFn(
      uv,
      u_line_width * pixel(1.0, iResolution.xy) * (1.0 - float(i) / float(u_line_count)),
      float(i) / float(u_line_count),
      (PI * 1.0) * float(i) / float(u_line_count),
      uMouse,
      iTime,
      uAmplitude,
      uDistance
    ));
  }

  float colorVal = 1.0 - line_strength;
  fragColor = vec4(uColor * colorVal, colorVal);
}

void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;

type Props = {
  /** 선 색 (0~1 정규화 RGB). 옅은 슬레이트 권장 */
  color?: [number, number, number];
  /** 흔들림 폭. 낮을수록 잔잔함 */
  amplitude?: number;
  /** 선 사이 퍼짐 */
  distance?: number;
  /** 마우스 반응 (로그인에선 끔) */
  enableMouseInteraction?: boolean;
};

/**
 * react bits "Threads" 배경 (ogl/WebGL). 가는 선이 부드럽게 흐른다.
 * 우리 톤에 맞춰 옅은 슬레이트 색·낮은 강도로 사용한다.
 * WebGL을 못 쓰는 환경(헤드리스 등)에서는 배경 없이 조용히 넘어간다.
 */
export default function Threads({
  color = [0.42, 0.49, 0.6],
  amplitude = 0.7,
  distance = 0.3,
  enableMouseInteraction = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cleanup: (() => void) | null = null;

    try {
      const renderer = new Renderer({ alpha: true });
      const gl = renderer.gl;
      gl.clearColor(0, 0, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.canvas.style.width = '100%';
      gl.canvas.style.height = '100%';
      gl.canvas.style.display = 'block';
      container.appendChild(gl.canvas);

      const geometry = new Triangle(gl);
      const program = new Program(gl, {
        vertex: vertexShader,
        fragment: fragmentShader,
        uniforms: {
          iTime: { value: 0 },
          iResolution: { value: [1, 1, 1] },
          uColor: { value: [color[0], color[1], color[2]] },
          uAmplitude: { value: amplitude },
          uDistance: { value: distance },
          uMouse: { value: [0.5, 0.5] },
        },
      });
      const mesh = new Mesh(gl, { geometry, program });

      const resize = () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        renderer.setSize(w, h);
        program.uniforms.iResolution.value[0] = w;
        program.uniforms.iResolution.value[1] = h;
        program.uniforms.iResolution.value[2] = w / Math.max(1, h);
      };
      window.addEventListener('resize', resize);
      resize();

      const current = [0.5, 0.5];
      let target = [0.5, 0.5];
      const onMove = (e: MouseEvent) => {
        const rect = container.getBoundingClientRect();
        target = [(e.clientX - rect.left) / rect.width, 1 - (e.clientY - rect.top) / rect.height];
      };
      const onLeave = () => { target = [0.5, 0.5]; };
      if (enableMouseInteraction) {
        container.addEventListener('mousemove', onMove);
        container.addEventListener('mouseleave', onLeave);
      }

      const update = (t: number) => {
        if (enableMouseInteraction) {
          current[0] += 0.05 * (target[0] - current[0]);
          current[1] += 0.05 * (target[1] - current[1]);
          program.uniforms.uMouse.value[0] = current[0];
          program.uniforms.uMouse.value[1] = current[1];
        }
        program.uniforms.iTime.value = t * 0.001;
        renderer.render({ scene: mesh });
        rafRef.current = requestAnimationFrame(update);
      };
      rafRef.current = requestAnimationFrame(update);

      cleanup = () => {
        cancelAnimationFrame(rafRef.current);
        window.removeEventListener('resize', resize);
        if (enableMouseInteraction) {
          container.removeEventListener('mousemove', onMove);
          container.removeEventListener('mouseleave', onLeave);
        }
        if (container.contains(gl.canvas)) container.removeChild(gl.canvas);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      };
    } catch {
      return;
    }

    return () => { if (cleanup) cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amplitude, distance, enableMouseInteraction, color[0], color[1], color[2]]);

  return <div ref={containerRef} aria-hidden="true" style={{ width: '100%', height: '100%' }} />;
}
