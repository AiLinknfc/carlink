'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface ShaderBackgroundProps {
  className?: string
  intensity?: number
}

export function ShaderBackground({ className, intensity = 1 }: ShaderBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const mouseRef = useRef({ x: 0.5, y: 0.5 })
  const targetRef = useRef({ x: 0.5, y: 0.5 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true })
    if (!gl) return

    const vertexShaderSource = `#version 300 es
      precision highp float;
      in vec2 a_position;
      out vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `

    const fragmentShaderSource = `#version 300 es
      precision highp float;
      in vec2 v_uv;
      out vec4 fragColor;
      
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_mouse;
      uniform float u_intensity;
      
      #define PI 3.14159265359
      
      vec3 hash(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return fract(sin(p) * 43758.5453);
      }
      
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        vec3 a = hash(i + vec2(0.0, 0.0));
        vec3 b = hash(i + vec2(1.0, 0.0));
        vec3 c = hash(i + vec2(0.0, 1.0));
        vec3 d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a.x, b.x, f.x), mix(c.x, d.x, f.x), f.y);
      }
      
      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 5; i++) {
          value += amplitude * noise(p);
          p *= 2.0;
          amplitude *= 0.5;
        }
        return value;
      }
      
      vec3 palette(float t) {
        vec3 a = vec3(0.05, 0.05, 0.08);
        vec3 b = vec3(0.3, 0.15, 0.55);
        vec3 c = vec3(0.7, 0.3, 1.0);
        vec3 d = vec3(0.0, 0.15, 0.95);
        vec3 e = vec3(0.3, 0.95, 1.0);
        return a + b * cos(6.28318 * (c * t + d)) + e * sin(6.28318 * (c * t + d));
      }
      
      void main() {
        vec2 uv = v_uv;
        vec2 center = u_mouse;
        
        float dist = distance(uv, center);
        float angle = atan(uv.y - center.y, uv.x - center.x);
        
        vec2 p = uv * 3.0;
        p.x += u_time * 0.02;
        p.y += u_time * 0.015;
        
        float n = fbm(p + u_time * 0.1);
        float n2 = fbm(p * 2.0 - u_time * 0.05);
        
        float ring = smoothstep(0.15, 0.12, dist) * (1.0 - smoothstep(0.4, 0.6, dist));
        ring *= u_intensity;
        
        float wave = sin(angle * 6.0 + u_time * 2.0 + n * 3.0) * 0.02;
        ring += wave * u_intensity;
        
        float glow = exp(-dist * 8.0) * 0.3 * u_intensity;
        glow += exp(-dist * 3.0) * n * 0.15 * u_intensity;
        
        vec3 col = palette(n * 0.5 + u_time * 0.05);
        col += palette(n2 * 0.3 + u_time * 0.03 + 0.33) * 0.5;
        col += vec3(0.7, 0.3, 1.0) * ring;
        col += vec3(0.0, 0.6, 1.0) * glow;
        col += vec3(1.0, 0.25, 0.95) * exp(-dist * 12.0) * 0.2 * u_intensity;
        
        float vignette = 1.0 - length(uv - 0.5) * 1.2;
        col *= vignette;
        
        float grain = (hash(gl_FragCoord.xy * 0.01) - 0.5) * 0.02;
        col += grain;
        
        fragColor = vec4(col, 1.0);
      }
    `

    function createShader(gl: WebGL2RenderingContext, type: number, source: string) {
      const shader = gl.createShader(type)!
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
      }
      return shader
    }

    function createProgram(gl: WebGL2RenderingContext, vs: WebGLShader, fs: WebGLShader) {
      const program = gl.createProgram()!
      gl.attachShader(program, vs)
      gl.attachShader(program, fs)
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program))
        return null
      }
      return program
    }

    const vs = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)
    if (!vs || !fs) return

    const program = createProgram(gl, vs, fs)
    if (!program) return

    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1,  -1, 1,
      -1,  1,  1, -1,   1, 1,
    ]), gl.STATIC_DRAW)

    const positionLoc = gl.getAttribLocation(program, 'a_position')
    const resolutionLoc = gl.getUniformLocation(program, 'u_resolution')
    const timeLoc = gl.getUniformLocation(program, 'u_time')
    const mouseLoc = gl.getUniformLocation(program, 'u_mouse')
    const intensityLoc = gl.getUniformLocation(program, 'u_intensity')

    function resize() {
      const dpr = Math.min(window.devicePixelRatio, 2)
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    let startTime = performance.now()

    function render(time: number) {
      const elapsed = (time - startTime) * 0.001

      mouseRef.current.x += (targetRef.current.x - mouseRef.current.x) * 0.05
      mouseRef.current.y += (targetRef.current.y - mouseRef.current.y) * 0.05

      gl.useProgram(program)
      gl.uniform2f(resolutionLoc, canvas.width, canvas.height)
      gl.uniform1f(timeLoc, elapsed)
      gl.uniform2f(mouseLoc, mouseRef.current.x, 1 - mouseRef.current.y)
      gl.uniform1f(intensityLoc, intensity)

      gl.enableVertexAttribArray(positionLoc)
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
      gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0)

      gl.drawArrays(gl.TRIANGLES, 0, 6)

      animationRef.current = requestAnimationFrame(render)
    }

    function handleMouseMove(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect()
      targetRef.current.x = (e.clientX - rect.left) / rect.width
      targetRef.current.y = (e.clientY - rect.top) / rect.height
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('resize', resize)
    resize()
    render(performance.now())

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', resize)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.deleteBuffer(positionBuffer)
    }
  }, [intensity])

  return (
    <canvas
      ref={canvasRef}
      className={cn('fixed inset-0 w-full h-full pointer-events-none', className)}
      aria-hidden="true"
    />
  )
}