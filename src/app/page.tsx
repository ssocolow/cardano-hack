'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the bubble chart component with no SSR
// This is necessary because D3 requires the window object
const StakePoolBubbleChart = dynamic(
    () => import('../components/StakePoolBubbleChart'),
    { ssr: false }
);

import { useEffect } from 'react';
import { StakePool } from '../scripts/services/CardanoService';

interface PoolsResponse {
    pools: StakePool[];
    lastUpdate: string;
    totalPools: number;
}

export default function HomePage() {
    const [pools, setPools] = useState<StakePool[]>([]);
    const [lastUpdate, setLastUpdate] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showGuide, setShowGuide] = useState(true);
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        const fetchPools = async () => {
            try {
                const response = await fetch('/api/pools');
                if (!response.ok) {
                    throw new Error('Failed to fetch pools');
                }
                const data: PoolsResponse = await response.json();
                console.log('Fetched pools:', data);
                setPools(data.pools);
                setLastUpdate(new Date(data.lastUpdate).toLocaleString());
            } catch (err) {
                console.error('Error fetching pools:', err);
                setError(err instanceof Error ? err.message : 'Failed to load pools');
            } finally {
                setLoading(false);
            }
        };

        fetchPools();
    }, []);

    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
    };

    if (loading) {
        return (
            <div className={`h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}`}>
                <div className="text-xl">Loading stake pools...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
                <div className="text-xl text-red-600">Error: {error}</div>
            </div>
        );
    }

    return (
        <div className={`h-screen overflow-hidden ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}`}>
            <div className="h-full container mx-auto px-4 py-8 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        Cardano Stake Pool Visualization
                    </h1>
                    <div className="flex items-center gap-4">
                        <a
                            href="https://github.com/ssocolow/cardano-hack"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                                darkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            } transition-colors`}
                        >
                            <svg height="20" width="20" viewBox="0 0 16 16" className="fill-current">
                                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                            </svg>
                            <span>View on GitHub</span>
                        </a>
                        <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Pool list last updated: {lastUpdate}
                        </div>
                        <button
                            onClick={toggleDarkMode}
                            className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 text-yellow-300' : 'bg-gray-200 text-gray-700'} hover:opacity-80 transition-colors`}
                            aria-label="Toggle dark mode"
                        >
                            {darkMode ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
                {showGuide && (
                    <div className={`fixed top-20 left-4 z-50 p-4 rounded-lg ${
                        darkMode ? 'bg-gray-800/90' : 'bg-white/90'
                    } shadow-lg backdrop-blur-sm max-w-md border ${
                        darkMode ? 'border-gray-700' : 'border-gray-200'
                    }`}>
                        <button 
                            onClick={() => setShowGuide(false)}
                            className={`absolute top-2 right-2 ${
                                darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                            }`}
                            aria-label="Close guide"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                        <h2 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                            Visualization Guide
                        </h2>
                        <ul className={`list-disc list-inside space-y-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            <li>Circle area represents the amount of ADA staked in the pool</li>
                            <li>Color intensity shows the number of blocks minted (brighter = more blocks)</li>
                            <li>Scroll to zoom in/out, drag to pan around</li>
                            <li>Hover over circles for detailed information</li>
                        </ul>
                    </div>
                )}
                <div className="flex-grow relative">
                    <StakePoolBubbleChart pools={pools} darkMode={darkMode} />
                </div>
            </div>
        </div>
    );
}
