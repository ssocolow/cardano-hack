import fs from 'fs';
import path from 'path';
import { cardanoService } from './services/CardanoService';

const CACHE_DIR = path.join(process.cwd(), 'cache');
const POOLS_CACHE_FILE = path.join(CACHE_DIR, 'stake-pools.json');
const CACHE_TIMESTAMP_FILE = path.join(CACHE_DIR, 'last-update.txt');

async function fetchAndStorePools() {
    console.log('Starting pool data fetch...');
    
    try {
        // Create cache directory if it doesn't exist
        if (!fs.existsSync(CACHE_DIR)) {
            fs.mkdirSync(CACHE_DIR, { recursive: true });
        }

        // Fetch all pools
        const pools = await cardanoService.getAllStakePools((current: number, total: number) => {
            console.log(`Fetched ${current} of ${total} pools`);
        });

        // Store pools data
        fs.writeFileSync(POOLS_CACHE_FILE, JSON.stringify(pools, null, 2));
        
        // Store timestamp
        fs.writeFileSync(CACHE_TIMESTAMP_FILE, new Date().toISOString());

        console.log(`Successfully cached ${pools.length} pools`);
    } catch (error) {
        console.error('Error fetching pools:', error);
        process.exit(1);
    }
}

// Run the script
fetchAndStorePools(); 