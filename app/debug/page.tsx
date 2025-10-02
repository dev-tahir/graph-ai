'use client';

import { useState, useEffect } from 'react';
import { localStorageManager } from '@/lib/local-storage';

export default function DebugPage() {
  const [data, setData] = useState<any>(null);
  const [graphId, setGraphId] = useState('SrnY1CSYEiG_SciBmDkoY');

  useEffect(() => {
    const loadData = async () => {
      const graphs = localStorageManager.getGraphs();
      const chats = localStorageManager.getChats();
      const specificGraph = localStorageManager.getGraph(graphId);
      
      // Also check database
      let dbGraphs = [];
      try {
        const response = await fetch('/api/graphs?limit=100');
        if (response.ok) {
          const data = await response.json();
          dbGraphs = data.graphs;
        }
      } catch (error) {
        console.error('Error fetching database graphs:', error);
      }
      
      setData({
        graphs,
        chats,
        specificGraph,
        dbGraphs,
        graphCount: graphs.length,
        chatCount: chats.length,
        dbGraphCount: dbGraphs.length,
      });
    };

    loadData();
  }, [graphId]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Debug Local Storage</h1>
      
      <div className="mb-6">
        <label className="block mb-2">Check specific graph ID:</label>
        <input
          type="text"
          value={graphId}
          onChange={(e) => setGraphId(e.target.value)}
          className="border p-2 rounded w-full max-w-md"
          placeholder="Enter graph ID"
        />
      </div>

      {data && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Summary</h2>
            <p>Local Storage Graphs: {data.graphCount}</p>
            <p>Database Graphs: {data.dbGraphCount}</p>
            <p>Chats: {data.chatCount}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Specific Graph ({graphId})</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
              {JSON.stringify(data.specificGraph, null, 2)}
            </pre>
          </div>

          <div>
            <h2 className="text-lg font-semibold">All Graphs</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-x-auto max-h-96">
              {JSON.stringify(data.graphs, null, 2)}
            </pre>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Database Graphs</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-x-auto max-h-96">
              {JSON.stringify(data.dbGraphs, null, 2)}
            </pre>
          </div>

          <div>
            <h2 className="text-lg font-semibold">All Chats</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-x-auto max-h-96">
              {JSON.stringify(data.chats, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}