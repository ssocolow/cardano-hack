const API_URL = 'https://cardano-mainnet.blockfrost.io/api/v0';

export interface StakePool {
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

type ProgressCallback = (current: number, total: number) => void;

class CardanoService {
    private headers: Record<string, string>;
    private batchSize = 50; // Blockfrost has a rate limit, so we process in batches
    private delayBetweenBatches = 1000; // 1 second delay between batches

    constructor() {
        this.headers = {
            'project_id': process.env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID || '',
            'Content-Type': 'application/json'
        };
    }

    private async fetchApi<T>(endpoint: string, retries = 3): Promise<T> {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const response = await fetch(`${API_URL}${endpoint}`, {
                    headers: this.headers
                });

                if (response.status === 429) { // Rate limit hit
                    const waitTime = attempt * 2000; // Exponential backoff
                    console.log(`Rate limit hit, waiting ${waitTime}ms before retry...`);
                    await this.sleep(waitTime);
                    continue;
                }

                if (!response.ok) {
                    throw new Error(`API call failed: ${response.status} - ${response.statusText}`);
                }

                const data = await response.json();
                return data as T;
            } catch (error) {
                if (attempt === retries) {
                    throw error;
                }
                console.log(`Attempt ${attempt} failed, retrying...`);
                await this.sleep(1000 * attempt); // Exponential backoff
            }
        }
        throw new Error(`Failed to fetch ${endpoint} after ${retries} attempts`);
    }

    private async sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private async processBatch(poolIds: string[], startIdx: number) {
        const batchPoolIds = poolIds.slice(startIdx, startIdx + this.batchSize);
        const poolPromises = batchPoolIds.map(poolId => 
            this.fetchApi<Partial<StakePool>>(`/pools/${poolId}`)
        );
        
        const pools = await Promise.all(poolPromises);
        
        // Get metadata for each pool in the batch
        const poolsWithMetadataPromises = pools.map(async pool => {
            if (!pool.pool_id) return pool as StakePool;
            
            try {
                const metadata = await this.fetchApi<StakePool['metadata']>(`/pools/${pool.pool_id}/metadata`);
                return { 
                    ...pool,
                    active: true,
                    metadata 
                } as StakePool;
            } catch {
                return {
                    ...pool,
                    active: true
                } as StakePool;
            }
        });

        return Promise.all(poolsWithMetadataPromises);
    }

    async getAllStakePools(onProgress?: ProgressCallback): Promise<StakePool[]> {
        try {
            // Get all stake pool IDs with pagination
            console.log('Fetching all pool IDs...');
            let page = 1;
            let allPoolIds: string[] = [];
            let hasMore = true;

            while (hasMore) {
                const poolIds = await this.fetchApi<string[]>(`/pools?page=${page}`);
                if (poolIds.length === 0) {
                    hasMore = false;
                } else {
                    allPoolIds = [...allPoolIds, ...poolIds];
                    console.log(`Fetched page ${page}, total pools so far: ${allPoolIds.length}`);
                    page++;
                }
            }

            console.log(`Found ${allPoolIds.length} total pools to process`);
            const allPools: StakePool[] = [];
            
            // Initialize progress
            onProgress?.(0, allPoolIds.length);
            
            // Process pools in batches
            for (let i = 0; i < allPoolIds.length; i += this.batchSize) {
                console.log(`Processing batch starting at index ${i}`);
                try {
                    const batchPools = await this.processBatch(allPoolIds, i);
                    allPools.push(...batchPools);
                    
                    // Update progress
                    onProgress?.(allPools.length, allPoolIds.length);
                    console.log(`Processed ${allPools.length}/${allPoolIds.length} pools`);
                    
                    // Wait before processing next batch to respect rate limits
                    if (i + this.batchSize < allPoolIds.length) {
                        console.log(`Waiting ${this.delayBetweenBatches}ms before next batch...`);
                        await this.sleep(this.delayBetweenBatches);
                    }
                } catch (batchError) {
                    console.error(`Error processing batch at index ${i}:`, batchError);
                    // Continue with next batch instead of failing completely
                    continue;
                }
            }

            console.log(`Finished processing all pools. Total pools collected: ${allPools.length}`);
            return allPools;
        } catch (error) {
            console.error('Error fetching stake pools:', error);
            throw error;
        }
    }

    async getCurrentEpoch() {
        try {
            return await this.fetchApi('/epochs/latest');
        } catch (error) {
            console.error('Error fetching current epoch:', error);
            throw error;
        }
    }

    async getPoolDelegatorsCount(poolId: string): Promise<number> {
        try {
            const pool = await this.fetchApi<StakePool>(`/pools/${poolId}`);
            return pool.live_delegators;
        } catch (error) {
            console.error(`Error fetching delegators count for pool ${poolId}:`, error);
            throw error;
        }
    }
}

export const cardanoService = new CardanoService();