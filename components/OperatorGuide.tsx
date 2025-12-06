import React from 'react';
import { Info } from 'lucide-react';

export const OperatorGuide: React.FC = () => {
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-3 text-blue-800">
        <Info className="w-5 h-5" />
        <h3 className="font-semibold">Search Operator Cheat Sheet</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead className="text-xs text-blue-700 uppercase bg-blue-100/50">
            <tr>
              <th className="px-3 py-2 rounded-l-lg">Goal</th>
              <th className="px-3 py-2">Operator</th>
              <th className="px-3 py-2">Example</th>
              <th className="px-3 py-2 rounded-r-lg">Explanation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-100">
            <tr>
              <td className="px-3 py-2 font-medium text-gray-700">Precise Match</td>
              <td className="px-3 py-2 font-mono text-indigo-600">AND</td>
              <td className="px-3 py-2 font-mono text-gray-600">BNP AND Election</td>
              <td className="px-3 py-2 text-gray-600">Contains BOTH words.</td>
            </tr>
            <tr>
              <td className="px-3 py-2 font-medium text-gray-700">Broad Search</td>
              <td className="px-3 py-2 font-mono text-indigo-600">OR</td>
              <td className="px-3 py-2 font-mono text-gray-600">Flood OR Surge</td>
              <td className="px-3 py-2 text-gray-600">Contains EITHER word.</td>
            </tr>
            <tr>
              <td className="px-3 py-2 font-medium text-gray-700">Exclude</td>
              <td className="px-3 py-2 font-mono text-indigo-600">-</td>
              <td className="px-3 py-2 font-mono text-gray-600">Cricket -Shakib</td>
              <td className="px-3 py-2 text-gray-600">Excludes 'Shakib'.</td>
            </tr>
            <tr>
              <td className="px-3 py-2 font-medium text-gray-700">Exact Phrase</td>
              <td className="px-3 py-2 font-mono text-indigo-600">""</td>
              <td className="px-3 py-2 font-mono text-gray-600">"Padma Bridge"</td>
              <td className="px-3 py-2 text-gray-600">Exact phrase match.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};