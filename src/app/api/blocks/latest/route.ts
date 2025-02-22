import { NextResponse } from 'next/server';

const API_URL = 'https://cardano-mainnet.blockfrost.io/api/v0';

interface BlockResponse {
    slot_leader: string;
    time: number;
    height: number;
    hash: string;
    epoch: number;
    slot: number;
}

export async function GET() {
    try {
        const response = await fetch(`${API_URL}/blocks/latest`, {
            headers: {
                'project_id': process.env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID || '',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API call failed: ${response.status}`);
        }

        const data: BlockResponse = await response.json();
        
        return NextResponse.json({
            slot_leader: data.slot_leader,
            time: data.time,
            height: data.height,
            hash: data.hash,
            epoch: data.epoch,
            slot: data.slot
        });
    } catch (error) {
        console.error('Error fetching latest block:', error);
        return NextResponse.json(
            { error: 'Failed to fetch latest block' },
            { status: 500 }
        );
    }
} 