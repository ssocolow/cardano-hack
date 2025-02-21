import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), 'cache');
const POOLS_CACHE_FILE = path.join(CACHE_DIR, 'stake-pools.json');
const CACHE_TIMESTAMP_FILE = path.join(CACHE_DIR, 'last-update.txt');

export async function GET() {
    try {
        // Check if cache exists
        if (!fs.existsSync(POOLS_CACHE_FILE)) {
            return NextResponse.json(
                { error: 'Pool data not cached yet' },
                { status: 503 }
            );
        }

        // Read cache files
        const poolsData = JSON.parse(fs.readFileSync(POOLS_CACHE_FILE, 'utf-8'));
        const lastUpdate = fs.readFileSync(CACHE_TIMESTAMP_FILE, 'utf-8');

        return NextResponse.json({
            pools: poolsData,
            lastUpdate,
            totalPools: poolsData.length
        });
    } catch (error) {
        console.error('Error serving pools data:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 