'use client';

import React, { useState } from 'react';
import { Bot, Copy, Check, Terminal, ExternalLink, X, Sparkles, Play } from 'lucide-react';

interface McpApiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const McpApiModal: React.FC<McpApiModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const origin = React.useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => 'http://localhost:3000'
  );
  const endpointUrl = `${origin}/api/mcp`;

  if (!isOpen) return null;

  const claudeDesktopConfig = JSON.stringify(
    {
      mcpServers: {
        'biome-beat-studio': {
          url: endpointUrl,
          type: 'jsonrpc-http',
        },
      },
    },
    null,
    2
  );

  const curlExample = `curl -X POST ${endpointUrl} \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_studio_state","arguments":{}}}'`;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const runTestMcpCall = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: 'get_studio_state', arguments: {} },
        }),
      });
      const data = await res.json();
      setTestResult(JSON.stringify(data, null, 2));
    } catch (e: unknown) {
      setTestResult(`Error: ${e instanceof Error ? e.message : 'Failed to reach MCP server'}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-[#10141d] border border-cyan-500/30 rounded-2xl shadow-2xl p-5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Model Context Protocol (MCP) & AI API</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-semibold">ONLINE</span>
              </h2>
              <p className="text-xs text-gray-400">Connect external AI agents (Claude, Windsurf, Cursor, Gemini) to control the studio via link</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-4 space-y-4 overflow-y-auto pr-1 text-xs">
          {/* Endpoint Banner */}
          <div className="p-3 bg-black/50 border border-white/10 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-semibold">Live MCP Endpoint URL</span>
              <span className="font-mono text-cyan-400 text-xs select-all">{endpointUrl}</span>
            </div>
            <button
              onClick={() => copyToClipboard(endpointUrl, 'url')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-gray-200 transition cursor-pointer font-medium"
            >
              {copied === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied === 'url' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Capabilities Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl">
              <span className="text-cyan-400 font-bold block mb-0.5">Deep Animation</span>
              <p className="text-[10px] text-gray-400">Frame-by-frame simulation control & deterministic stepping.</p>
            </div>
            <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl">
              <span className="text-orange-400 font-bold block mb-0.5">Scratch Rules</span>
              <p className="text-[10px] text-gray-400">Add dynamic triggers, multiplier gates, chords, & elasticity.</p>
            </div>
            <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl">
              <span className="text-purple-400 font-bold block mb-0.5">Zero API Keys</span>
              <p className="text-[10px] text-gray-400">100% open-source, no credentials leaked, GitHub import safe.</p>
            </div>
          </div>

          {/* Claude / Cursor Config */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-gray-300">Claude Desktop / Cursor Config (`mcp.json`):</span>
              <button
                onClick={() => copyToClipboard(claudeDesktopConfig, 'claude')}
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 cursor-pointer"
              >
                {copied === 'claude' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied === 'claude' ? 'Copied' : 'Copy JSON'}</span>
              </button>
            </div>
            <pre className="p-3 bg-black/60 border border-white/10 rounded-xl font-mono text-[11px] text-gray-300 overflow-x-auto select-all">
              {claudeDesktopConfig}
            </pre>
          </div>

          {/* cURL Example */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-gray-300">cURL JSON-RPC 2.0 Test Call:</span>
              <button
                onClick={() => copyToClipboard(curlExample, 'curl')}
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 cursor-pointer"
              >
                {copied === 'curl' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied === 'curl' ? 'Copied' : 'Copy cURL'}</span>
              </button>
            </div>
            <pre className="p-3 bg-black/60 border border-white/10 rounded-xl font-mono text-[11px] text-gray-300 overflow-x-auto select-all">
              {curlExample}
            </pre>
          </div>

          {/* Live Test In Browser */}
          <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Test MCP Tool Call Right Here:</span>
              <button
                onClick={runTestMcpCall}
                disabled={isTesting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-black font-bold transition cursor-pointer text-xs"
              >
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>{isTesting ? 'Calling MCP...' : 'Call get_studio_state'}</span>
              </button>
            </div>
            {testResult && (
              <pre className="mt-2 p-2.5 bg-black/70 border border-cyan-500/30 rounded-lg font-mono text-[10px] text-emerald-400 max-h-40 overflow-y-auto">
                {testResult}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
