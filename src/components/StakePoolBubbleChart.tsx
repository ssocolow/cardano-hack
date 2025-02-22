import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { StakePool } from '../scripts/services/CardanoService';

interface Props {
    pools: StakePool[];
    darkMode: boolean;
}

interface PoolData {
    id: string;
    value: number;
    name: string;
    homepage: string;
    ticker: string;
    blocks: number;
}

interface BlockUpdate {
    slot_leader: string;
    time: number;
    height: number;
    hash: string;
    epoch: number;
    slot: number;
}

interface BlockNotification extends BlockUpdate {
    poolName: string;
    uniqueId: string;
}

// Helper function to get domain from URL
const getDomainFromUrl = (urlString: string): string => {
    try {
        // Add https:// if no protocol is specified
        const urlWithProtocol = urlString.startsWith('http') ? urlString : `https://${urlString}`;
        const url = new URL(urlWithProtocol);
        return url.hostname.replace(/^www\./, '');
    } catch {
        return urlString;
    }
};

const StakePoolBubbleChart = ({ pools, darkMode }: Props): React.ReactElement => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [currentSlotLeader, setCurrentSlotLeader] = useState<string | null>(null);
    const [blockHistory, setBlockHistory] = useState<BlockNotification[]>([]);
    const MAX_HISTORY = 3; // Keep last 3 blocks
    const lastBlockRef = useRef<number | null>(null);

    // Fetch latest block info every 15 seconds
    useEffect(() => {
        const fetchLatestBlock = async () => {
            try {
                const response = await fetch('/api/blocks/latest');
                if (!response.ok) {
                    throw new Error('Failed to fetch latest block');
                }
                const data: BlockUpdate = await response.json();
                
                // Only process if this is a new block
                if (data.height !== lastBlockRef.current) {
                    lastBlockRef.current = data.height;
                    
                    // Find the pool name
                    const leaderPool = pools.find(pool => pool.pool_id === data.slot_leader);
                    const poolName = leaderPool?.metadata?.name || 'Unknown Pool';
                    
                    setCurrentSlotLeader(data.slot_leader);

                    // Update block history
                    setBlockHistory(prev => [
                        { ...data, poolName, uniqueId: `${data.height}` },
                        ...prev.filter(block => block.height !== data.height).slice(0, MAX_HISTORY - 1)
                    ]);
                }
            } catch (error) {
                console.error('Error fetching latest block:', error);
            }
        };

        // Initial fetch
        fetchLatestBlock();

        // Set up polling
        const interval = setInterval(fetchLatestBlock, 15000);

        return () => clearInterval(interval);
    }, [pools]); // Remove blockHistory dependency

    useEffect(() => {
        if (!pools.length || !svgRef.current) return;

        console.log('Processing pools:', pools.length);

        // Clear any existing visualization
        d3.select(svgRef.current).selectAll("*").remove();

        // Setup dimensions
        const width = 1200;
        const height = 800;
        const legendWidth = 200;
        const legendHeight = 20;

        // Create SVG
        const svg = d3.select(svgRef.current)
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', [0, 0, width, height])
            .attr('style', 'max-width: 100%; height: auto;');

        // Create container for zoom
        const container = svg.append('g');

        // Create a fixed overlay group for legend that won't be affected by zoom
        const overlay = svg.append('g')
            .attr('class', 'overlay')
            .style('pointer-events', 'none');

        // Process data
        const poolData: PoolData[] = pools
            .filter(pool => pool.live_stake && pool.metadata)
            .map(pool => ({
                id: pool.pool_id,
                value: parseInt(pool.live_stake) / 1e6, // Convert to ADA
                name: pool.metadata?.name || 'Unknown',
                homepage: pool.metadata?.homepage || '',
                ticker: pool.metadata?.ticker || '',
                blocks: pool.blocks_minted
            }));

        // Create pack layout
        const pack = d3.pack<PoolData>()
            .size([width, height - 60])
            .padding(3);

        // Create hierarchy and compute the layout
        type HierarchyData = PoolData | { children: PoolData[] };

        const root = d3.hierarchy<HierarchyData>({ children: poolData })
            .sum((d) => 'children' in d ? 0 : d.value)
            .sort((a, b) => {
                const aData = a.data as PoolData;
                const bData = b.data as PoolData;
                return (bData.value || 0) - (aData.value || 0);
            });

        const nodes = pack(root as d3.HierarchyNode<PoolData>).leaves();

        // Create a color scale based on blocks minted
        const maxBlocks = d3.max(poolData, d => d.blocks) || 0;
        const colorScale = d3.scaleSequential()
            .domain([0, maxBlocks])
            .interpolator(d3.interpolateViridis);

        // Draw circles
        const circles = container.selectAll('circle')
            .data(nodes)
            .join('circle')
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .attr('r', d => d.r)
            .attr('fill', d => colorScale((d.data as PoolData).blocks))
            .attr('opacity', 0.8)
            .style('cursor', 'pointer')
            .attr('class', d => `pool-${(d.data as PoolData).id}`);

        // Function to highlight slot leader
        const highlightSlotLeader = (slotLeaderId: string | null) => {
            // Reset all circles
            circles
                .attr('stroke-width', 0)
                .attr('stroke', 'none')
                .attr('opacity', 0.8);

            if (slotLeaderId) {
                // Highlight the slot leader
                const slotLeaderCircle = container.select(`.pool-${slotLeaderId}`);
                if (!slotLeaderCircle.empty()) {
                    // Remove old effects and their definitions
                    container.selectAll('.starburst, .pulse-ring, .glow-effect').remove();
                    svg.selectAll('defs').remove();

                    // Get position and size
                    const cx = slotLeaderCircle.attr('cx');
                    const cy = slotLeaderCircle.attr('cy');
                    const r = parseFloat(slotLeaderCircle.attr('r'));

                    // Add multiple starburst rings with brighter colors
                    const colors = darkMode 
                        ? ['#ffffff', '#00ffff', '#ff00ff'] 
                        : ['#ff0000', '#ffff00', '#ff8c00'];
                    
                    colors.forEach((color, i) => {
                        // Outer starburst
                        const starburst = container.append('circle')
                            .attr('class', 'starburst')
                            .attr('cx', cx)
                            .attr('cy', cy)
                            .attr('r', r * (1.3 + i * 0.2))
                            .attr('fill', 'none')
                            .attr('stroke', color)
                            .attr('stroke-width', 3)
                            .attr('stroke-dasharray', '5,5')
                            .style('pointer-events', 'none')
                            .style('opacity', 0.9);

                        // Rotate animation
                        function rotateStarburst() {
                            starburst
                                .transition()
                                .duration(1500 - i * 300)
                                .ease(d3.easeLinear)
                                .attrTween('transform', () => {
                                    return (t) => `rotate(${t * 360 * (i % 2 ? -1 : 1)},${cx},${cy})`;
                                })
                                .on('end', rotateStarburst);
                        }
                        rotateStarburst();

                        // Add pulsing rings
                        const pulseRing = container.append('circle')
                            .attr('class', 'pulse-ring')
                            .attr('cx', cx)
                            .attr('cy', cy)
                            .attr('r', r * (1.2 + i * 0.15))
                            .attr('fill', 'none')
                            .attr('stroke', color)
                            .attr('stroke-width', 2)
                            .style('pointer-events', 'none')
                            .style('opacity', 0.7);

                        function pulseAnimation() {
                            pulseRing
                                .transition()
                                .duration(1000 + i * 200)
                                .ease(d3.easeQuadInOut)
                                .attr('r', r * (1.8 + i * 0.2))
                                .style('opacity', 0)
                                .on('end', () => {
                                    pulseRing
                                        .attr('r', r * (1.2 + i * 0.15))
                                        .style('opacity', 0.7);
                                    pulseAnimation();
                                });
                        }
                        pulseAnimation();
                    });

                    // Enhanced glow effect with multiple layers
                    const defs = svg.append('defs');
                    const filter = defs.append('filter')
                        .attr('id', 'enhanced-glow')
                        .attr('x', '-50%')
                        .attr('y', '-50%')
                        .attr('width', '200%')
                        .attr('height', '200%');

                    // Outer glow
                    filter.append('feGaussianBlur')
                        .attr('class', 'glow')
                        .attr('in', 'SourceGraphic')
                        .attr('stdDeviation', '8')
                        .attr('result', 'glow1');

                    // Inner glow
                    filter.append('feGaussianBlur')
                        .attr('in', 'SourceGraphic')
                        .attr('stdDeviation', '4')
                        .attr('result', 'glow2');

                    // Combine glows
                    const feMerge = filter.append('feMerge');
                    feMerge.append('feMergeNode').attr('in', 'glow1');
                    feMerge.append('feMergeNode').attr('in', 'glow2');
                    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

                    // Apply enhanced effects to the slot leader circle
                    slotLeaderCircle
                        .style('filter', 'url(#enhanced-glow)')
                        .attr('stroke', darkMode ? '#ffffff' : '#ff0000')
                        .attr('stroke-width', 5)
                        .attr('opacity', 1)
                        .raise();

                    // Add shimmering effect
                    const shimmer = container.append('circle')
                        .attr('class', 'shimmer')
                        .attr('cx', slotLeaderCircle.attr('cx'))
                        .attr('cy', slotLeaderCircle.attr('cy'))
                        .attr('r', slotLeaderCircle.attr('r'))
                        .attr('fill', 'none')
                        .attr('stroke', darkMode ? '#ffffff' : '#ffff00')
                        .attr('stroke-width', 3)
                        .style('pointer-events', 'none')
                        .style('opacity', 0.5);

                    function shimmerAnimation() {
                        shimmer
                            .transition()
                            .duration(1000)
                            .ease(d3.easeSinInOut)
                            .style('opacity', 0.8)
                            .transition()
                            .duration(1000)
                            .ease(d3.easeSinInOut)
                            .style('opacity', 0.2)
                            .on('end', shimmerAnimation);
                    }
                    shimmerAnimation();
                }
            }
        };

        // Update highlight when currentSlotLeader changes
        highlightSlotLeader(currentSlotLeader);

        // Add labels for all bubbles
        container.selectAll('foreignObject')
            .data(nodes)
            .join('foreignObject')
            .attr('x', d => d.x - d.r * 0.8)
            .attr('y', d => d.y - d.r * 0.3)
            .attr('width', d => d.r * 1.6)
            .attr('height', d => d.r * 0.6)
            .attr('text-anchor', 'middle')
            .style('pointer-events', 'none')
            .append('xhtml:div')
            .style('text-align', 'center')
            .style('font-size', d => Math.max(8, Math.min(d.r / 5, 14)) + 'px')
            .style('color', 'white')
            .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.5)')
            .style('overflow', 'hidden')
            .style('text-overflow', 'ellipsis')
            .style('display', '-webkit-box')
            .style('-webkit-line-clamp', '2')
            .style('-webkit-box-orient', 'vertical')
            .html(d => {
                const data = d.data as PoolData;
                const displayName = data.name.length > 30 ? data.name.substring(0, 27) + '...' : data.name;
                return `
                    <div style="margin-bottom: 2px;">${displayName}</div>
                    ${data.homepage ? `<a href="${data.homepage}" target="_blank" style="color: #e0f0ff; font-size: 0.8em;">${getDomainFromUrl(data.homepage)}</a>` : ''}
                `;
            });

        // Create color legend in the overlay group
        const legendX = (width - legendWidth) / 2;
        const legendY = height - 30;

        // Create gradient for legend
        const defs = svg.append('defs');
        const gradient = defs.append('linearGradient')
            .attr('id', 'legend-gradient')
            .attr('x1', '0%')
            .attr('x2', '100%')
            .attr('y1', '0%')
            .attr('y2', '0%');

        // Add gradient stops
        const numStops = 10;
        for (let i = 0; i < numStops; i++) {
            const offset = (i / (numStops - 1)) * 100;
            gradient.append('stop')
                .attr('offset', `${offset}%`)
                .attr('stop-color', colorScale(maxBlocks * (i / (numStops - 1))));
        }

        // Add legend rectangle to overlay
        overlay.append('rect')
            .attr('x', legendX)
            .attr('y', legendY)
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            .attr('rx', 2)
            .style('fill', 'url(#legend-gradient)')
            .style('stroke', darkMode ? '#555' : '#ddd')
            .style('stroke-width', 1);

        // Add legend labels to overlay with improved contrast
        overlay.append('text')
            .attr('x', legendX)
            .attr('y', legendY - 5)
            .attr('text-anchor', 'start')
            .style('fill', darkMode ? '#fff' : '#333')
            .style('font-size', '12px')
            .style('font-weight', '500')
            .text('0 blocks');

        overlay.append('text')
            .attr('x', legendX + legendWidth)
            .attr('y', legendY - 5)
            .attr('text-anchor', 'end')
            .style('fill', darkMode ? '#fff' : '#333')
            .style('font-size', '12px')
            .style('font-weight', '500')
            .text(`${d3.format(",")(maxBlocks)} blocks`);

        // Add tooltip for additional information
        const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('position', 'absolute')
            .style('background-color', darkMode ? 'rgba(0, 0, 0, 0.9)' : 'white')
            .style('color', darkMode ? '#fff' : '#333')
            .style('padding', '10px')
            .style('border', `1px solid ${darkMode ? '#555' : '#ddd'}`)
            .style('border-radius', '5px')
            .style('box-shadow', darkMode ? '0 2px 4px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.1)')
            .style('pointer-events', 'none')
            .style('opacity', 0)
            .style('z-index', 1000);

        // Add hover effects and tooltip
        circles
            .on('mouseover', (event, d) => {
                const data = d.data as PoolData;
                tooltip.transition()
                    .duration(200)
                    .style('opacity', .9);
                tooltip.html(`
                    <strong>${data.name}</strong><br/>
                    Ticker: ${data.ticker}<br/>
                    Stake: ${d3.format(",")(Math.round(data.value))} ADA<br/>
                    Blocks Minted: ${d3.format(",")(data.blocks)}
                    ${data.id === currentSlotLeader ? '<br/><strong style="color: #00ff00">Current Slot Leader!</strong>' : ''}
                `)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');

                if (data.id !== currentSlotLeader) {
                    d3.select(event.currentTarget)
                        .attr('opacity', 1)
                        .attr('stroke', darkMode ? '#fff' : '#333')
                        .attr('stroke-width', 2);
                }
            })
            .on('mouseout', (event, d) => {
                tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);

                const data = d.data as PoolData;
                if (data.id !== currentSlotLeader) {
                    d3.select(event.currentTarget)
                        .attr('opacity', 0.8)
                        .attr('stroke', 'none');
                }
            });

        // Add zoom capability
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.5, 5])
            .on('zoom', (event) => {
                container.attr('transform', event.transform);
            });

        svg.call(zoom);

        // Clean up tooltip on unmount
        return () => {
            tooltip.remove();
        };
    }, [pools, darkMode, currentSlotLeader]);

    return (
        <div className="stake-pool-bubble-chart w-full h-full relative">
            <div className="absolute top-4 right-4 space-y-2">
                {blockHistory.map((block, index) => (
                    <div
                        key={block.uniqueId}
                        className={`px-4 py-2 rounded-lg backdrop-blur-sm ${
                            index === 0 ? 'z-50' : 'z-40'
                        } ${darkMode ? 'bg-gray-800/70 text-white' : 'bg-white/70 text-gray-800'
                        } shadow-lg border ${
                            darkMode ? 'border-gray-700' : 'border-gray-200'
                        } transition-all duration-300 ${
                            index === 0 ? 'opacity-100 scale-100' : 'opacity-70 scale-95'
                        }`}
                    >
                        <div className="text-sm font-semibold">
                            <a
                                href={`https://cexplorer.io/block/${block.hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`hover:opacity-80 transition-opacity ${
                                    darkMode ? 'text-blue-400' : 'text-blue-600'
                                }`}
                            >
                                Block #{block.height}
                            </a>
                        </div>
                        <div className="text-xs opacity-90">
                            Minted at {new Date(block.time * 1000).toLocaleTimeString()}
                        </div>
                        <div className="text-xs mt-1">
                            <span className="font-semibold">Slot Leader:</span><br/>
                            <span className={`font-medium ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                                {block.poolName}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
            <svg ref={svgRef} className="w-full"></svg>
        </div>
    );
};

export default StakePoolBubbleChart;