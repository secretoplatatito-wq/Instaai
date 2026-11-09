import { NextRequest, NextResponse } from 'next/server';

// In-memory runtime state for MCP link-based integration
let studioState = {
  studioMode: '2d-sandbox',
  sandboxConfig: {
    type: 'egg-pi',
    headlineText: 'Colliding blocks calculate π',
    counterLabel: 'π collisions',
    ballRadius: 48,
    shrinkRate: 0.96,
    restitution: 0.98,
    gravity: 1.4,
    speed: 1.2,
    ballCount: 1,
    colorTheme: 'rainbow',
    soundFxEnabled: true,
    showLiveMetrics: true,
    laserReflectionCount: 140,
    multiplierTarget: 10000,
    piMassRatioPower: 4,
    temperatureCelsius: 999,
  },
  biomeConfig: {
    biomeType: 'metallic-gravity',
    seed: 1042,
    density: 1.0,
    speedMultiplier: 1.0,
    primaryColor: '#ff6b35',
    secondaryColor: '#00f2fe',
    accentColor: '#ffd166',
    glowIntensity: 1.4,
  },
  exportSettings: {
    resolution: '4K Ultra HD (2160 × 3840)',
    fps: 60,
    format: 'mp4',
    bitrateMbps: 80,
    enableHDR10: true,
    hdrPeakLuminance: 1000,
  },
  currentFrame: 0,
  simTime: 0,
  scratchRules: [
    { id: 'rule-1', event: 'on_beat', action: 'multiply_ball', value: 2, enabled: true },
    { id: 'rule-2', event: 'on_wall_hit', action: 'play_chord', value: 440, enabled: true },
  ],
};

const MCP_TOOLS = [
  {
    name: 'get_studio_state',
    description: 'Get current Biome Beat Studio state including active mode (3D biome or 2D viral sandbox), parameters, rules, and export settings.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'set_studio_mode',
    description: 'Switch studio mode between 3D procedural biome and 2D viral sandbox.',
    inputSchema: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['3d-biome', '2d-sandbox'],
          description: 'The studio mode to activate.',
        },
      },
      required: ['mode'],
    },
  },
  {
    name: 'configure_2d_sandbox',
    description: 'Deeply customize the 2D viral physics sandbox, presets, headline banner question, gravity, speed, and rules.',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: [
            'ellipse-laser',
            'wedge-escape',
            'multiplier-overload',
            'egg-pi',
            'planet-flask',
            'spring-smash',
            'bands-broken',
            'spirograph-flower',
            'branching-waves',
            'landmark-flask',
          ],
          description: 'Simulation preset type.',
        },
        headlineText: { type: 'string', description: 'Viral question or headline displayed at top.' },
        ballRadius: { type: 'number', description: 'Radius of ball in pixels (12-80).' },
        gravity: { type: 'number', description: 'Gravity force (0.5 to 5.0).' },
        restitution: { type: 'number', description: 'Bounciness / elasticity (0.6 to 1.05).' },
        speed: { type: 'number', description: 'Simulation speed multiplier (0.5 to 3.0).' },
        colorTheme: {
          type: 'string',
          enum: ['cyan-orange', 'rainbow', 'cyberpunk', 'monochrome', 'gold-emerald'],
        },
        piMassRatioPower: { type: 'number', description: 'Power of 10 for pi mass ratio (2=31 hits, 4=314 hits, 6=3141 hits).' },
        temperatureCelsius: { type: 'number', description: 'Incandescent sphere temperature (100 to 1000 C).' },
      },
    },
  },
  {
    name: 'configure_3d_biome',
    description: 'Deeply customize 3D procedural biome environments, colors, glow, speed, and density.',
    inputSchema: {
      type: 'object',
      properties: {
        biomeType: {
          type: 'string',
          enum: [
            'metallic-gravity',
            'physics-playground',
            'neon-rainbow',
            'cosmic-orbital',
            'mechanical-universe',
            'crystal-cavern',
            'liquid-neon',
            'fourier-harp',
          ],
        },
        primaryColor: { type: 'string', description: 'Hex color for primary structures.' },
        secondaryColor: { type: 'string', description: 'Hex color for secondary rails/chimes.' },
        glowIntensity: { type: 'number', description: 'Glow factor (0.4 to 3.0).' },
        speedMultiplier: { type: 'number', description: 'Speed factor (0.2 to 3.0).' },
      },
    },
  },
  {
    name: 'add_scratch_rule',
    description: 'Add or modify a Scratch-style rule block for dynamic interactive animation.',
    inputSchema: {
      type: 'object',
      properties: {
        event: {
          type: 'string',
          enum: ['on_wall_hit', 'on_floor_hit', 'on_beat', 'on_collision', 'on_timer'],
        },
        action: {
          type: 'string',
          enum: ['multiply_ball', 'shrink_radius', 'grow_radius', 'play_chord', 'add_score', 'invert_gravity', 'spawn_burst'],
        },
        value: { type: 'number', description: 'Parameter value for rule action.' },
        enabled: { type: 'boolean' },
      },
      required: ['event', 'action', 'value'],
    },
  },
  {
    name: 'step_frame_animation',
    description: 'Advance simulation by an exact delta time and frame index for frame-by-frame AI animation.',
    inputSchema: {
      type: 'object',
      properties: {
        fps: { type: 'number', default: 60, description: 'Target framerate.' },
        frameCount: { type: 'number', default: 1, description: 'Number of frames to advance.' },
      },
    },
  },
  {
    name: 'trigger_render_export',
    description: 'Configure and start deterministic lossless video render at specified resolution, framerate, and HDR10 peak.',
    inputSchema: {
      type: 'object',
      properties: {
        resolution: { type: 'string', enum: ['8K Ultra', '4K UHD', '2K QHD', '1080p', '720p'] },
        fps: { type: 'number', enum: [24, 30, 60, 120, 240] },
        format: { type: 'string', enum: ['mp4', 'webm'] },
        bitrateMbps: { type: 'number', description: 'Bitrate in Mbps (1 to 250).' },
        enableHDR10: { type: 'boolean' },
        hdrPeakLuminance: { type: 'number', description: '100 to 1000 nits.' },
      },
    },
  },
];

export async function GET() {
  return NextResponse.json({
    name: 'biome-beat-studio-mcp',
    description: 'Model Context Protocol (MCP) server for Biome Beat Studio & 2D Viral Sandbox.',
    version: '1.0.0',
    protocol: 'mcp-jsonrpc-2.0',
    endpoint: '/api/mcp',
    capabilities: {
      tools: MCP_TOOLS.map((t) => t.name),
    },
    status: 'online',
    openSource: true,
    requiresSecrets: false,
    docs: 'Send JSON-RPC 2.0 POST requests to this endpoint with method initialize, tools/list, or tools/call.',
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, method, params } = body;

    // 1. Initialize
    if (method === 'initialize') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: { listChanged: false },
          },
          serverInfo: {
            name: 'biome-beat-studio-mcp',
            version: '1.0.0',
          },
        },
      });
    }

    // 2. Tools List
    if (method === 'tools/list') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          tools: MCP_TOOLS,
        },
      });
    }

    // 3. Tools Call
    if (method === 'tools/call') {
      const toolName = params?.name;
      const args = params?.arguments || {};

      switch (toolName) {
        case 'get_studio_state': {
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(studioState, null, 2),
                },
              ],
            },
          });
        }

        case 'set_studio_mode': {
          if (args.mode) {
            studioState.studioMode = args.mode;
          }
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: `Studio mode updated to ${studioState.studioMode}`,
                },
              ],
            },
          });
        }

        case 'configure_2d_sandbox': {
          studioState.sandboxConfig = {
            ...studioState.sandboxConfig,
            ...args,
          };
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: `Sandbox configuration updated: ${JSON.stringify(studioState.sandboxConfig, null, 2)}`,
                },
              ],
            },
          });
        }

        case 'configure_3d_biome': {
          studioState.biomeConfig = {
            ...studioState.biomeConfig,
            ...args,
          };
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: `3D Biome configuration updated: ${JSON.stringify(studioState.biomeConfig, null, 2)}`,
                },
              ],
            },
          });
        }

        case 'add_scratch_rule': {
          const newRule = {
            id: `rule-${Date.now()}`,
            event: args.event,
            action: args.action,
            value: args.value,
            enabled: args.enabled ?? true,
          };
          studioState.scratchRules.push(newRule);
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: `Scratch rule added: ${JSON.stringify(newRule)}`,
                },
              ],
            },
          });
        }

        case 'step_frame_animation': {
          const fps = args.fps || 60;
          const count = args.frameCount || 1;
          const dt = (1.0 / fps) * count;
          studioState.currentFrame += count;
          studioState.simTime += dt;
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: `Advanced animation by ${count} frames. Current frame: ${studioState.currentFrame}, simulation time: ${studioState.simTime.toFixed(3)}s.`,
                },
              ],
            },
          });
        }

        case 'trigger_render_export': {
          studioState.exportSettings = {
            ...studioState.exportSettings,
            ...args,
          };
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: `Export pipeline configured with settings: ${JSON.stringify(studioState.exportSettings, null, 2)}. Ready to render.`,
                },
              ],
            },
          });
        }

        default:
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Unknown tool: ${toolName}`,
            },
          });
      }
    }

    return NextResponse.json({
      jsonrpc: '2.0',
      id: id || null,
      error: {
        code: -32600,
        message: 'Invalid Request: unrecognized method.',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32603,
        message: `Internal error: ${message}`,
      },
    });
  }
}
