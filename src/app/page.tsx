'use client';

import { useEffect, useState, useMemo } from 'react';

// Define the type locally or in a separate types file
interface StakePool {
    pool_id: string;
    hex: string;
    vrf_key: string;
    blocks_minted: number;
    blocks_epoch: number;
    live_stake: string;
    live_size: number;
    live_saturation: number;
    live_delegators: number;
    active_stake: string;
    active: boolean;
    metadata?: {
        name: string;
        description: string;
        ticker: string;
        homepage: string;
        location?: string;
    };
}

// Utility function to format ADA amounts
const formatADA = (lovelace: string) => {
  const ada = parseInt(lovelace) / 1000000;
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(ada);
};

// Utility function to format date
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString();
};

type SortField = 'stake' | 'delegators' | 'blocks';
type SortDirection = 'asc' | 'desc';

export default function Home() {
  const [stakePools, setStakePools] = useState<StakePool[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('stake');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchPools = async () => {
      try {
        const response = await fetch('/api/pools');
        if (!response.ok) {
          throw new Error('Failed to fetch pools');
        }
        const data = await response.json();
        setStakePools(data.pools);
        setLastUpdate(data.lastUpdate);
      } catch (err) {
        setError('Failed to fetch stake pools');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPools();
  }, []);

  const sortedPools = useMemo(() => {
    return [...stakePools]
      .filter(pool => {
        const searchLower = searchTerm.toLowerCase();
        return (
          pool.metadata?.name?.toLowerCase().includes(searchLower) ||
          pool.metadata?.ticker?.toLowerCase().includes(searchLower) ||
          pool.pool_id.toLowerCase().includes(searchLower)
        );
      })
      .sort((a, b) => {
        const direction = sortDirection === 'desc' ? -1 : 1;
        switch (sortField) {
          case 'stake':
            return (parseInt(a.live_stake) - parseInt(b.live_stake)) * direction;
          case 'delegators':
            return (a.live_delegators - b.live_delegators) * direction;
          case 'blocks':
            return (a.blocks_minted - b.blocks_minted) * direction;
          default:
            return 0;
        }
      });
  }, [stakePools, sortField, sortDirection, searchTerm]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return <div className="flex items-center justify-center min-h-screen text-red-500">{error}</div>;
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Cardano Stake Pools</h1>
          <div className="text-right">
            <p className="text-gray-600">Total Pools: {stakePools.length}</p>
            <p className="text-sm text-gray-500">Last updated: {formatDate(lastUpdate)}</p>
          </div>
        </div>
        
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search pools by name, ticker, or ID..."
            className="w-full p-2 border rounded-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="mb-4 flex gap-4">
          <button
            onClick={() => handleSort('stake')}
            className={`px-4 py-2 rounded ${sortField === 'stake' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Sort by Stake {sortField === 'stake' && (sortDirection === 'desc' ? '↓' : '↑')}
          </button>
          <button
            onClick={() => handleSort('delegators')}
            className={`px-4 py-2 rounded ${sortField === 'delegators' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Sort by Delegators {sortField === 'delegators' && (sortDirection === 'desc' ? '↓' : '↑')}
          </button>
          <button
            onClick={() => handleSort('blocks')}
            className={`px-4 py-2 rounded ${sortField === 'blocks' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Sort by Blocks {sortField === 'blocks' && (sortDirection === 'desc' ? '↓' : '↑')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedPools.map((pool) => (
            <div key={pool.pool_id} className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-xl font-semibold mb-2">
                {pool.metadata?.name || 'Unnamed Pool'}
              </h2>
              <p className="text-sm text-gray-600 mb-2">
                {pool.metadata?.ticker || 'No Ticker'}
              </p>
              <div className="text-sm space-y-1">
                <p className="flex justify-between">
                  <span className="text-gray-600">Live Stake:</span>
                  <span className="font-medium">{formatADA(pool.live_stake)} ₳</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-600">Delegators:</span>
                  <span className="font-medium">{pool.live_delegators.toLocaleString()}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-600">Blocks Minted:</span>
                  <span className="font-medium">{pool.blocks_minted.toLocaleString()}</span>
                </p>
                {pool.metadata?.location && (
                  <p className="text-gray-600 mt-2">📍 {pool.metadata.location}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
