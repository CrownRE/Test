import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import * as d3 from 'd3';
import { Contact } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { generationColors } from '../utils/family';
import ConfirmationModal from './ConfirmationModal';

interface FamilyTreeProps {
  onViewContact: (contactId: string) => void;
  contacts: Contact[];
  onAddNewChild: (parentId: string) => void;
  onEditContact: (contactId: string) => void;
  onDeleteContact: (contactId: string) => void;
  onFocusContact: (contactId: string) => void;
  focusedContactId: string | null;
  fitTrigger: number;
  centerOnNodeId: string | null;
  onCenterComplete: () => void;
  connectionPath: { nodes: string[]; links: [string, string][]; orderedPath: string[] } | null;
  nodeToPin: string | null;
  onPinComplete: () => void;
}

interface ContactNode extends Contact {
  children: ContactNode[];
}

type FamilyTreeNode = d3.HierarchyNode<ContactNode>;
type PointNode = d3.HierarchyPointNode<ContactNode>;

const FamilyTree: React.FC<FamilyTreeProps> = ({ onViewContact, contacts, onAddNewChild, onEditContact, onDeleteContact, onFocusContact, focusedContactId, fitTrigger, centerOnNodeId, onCenterComplete, connectionPath, nodeToPin, onPinComplete }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<PointNode | null>(null);
  
  const chartRef = useRef<{
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null;
    g: d3.Selection<SVGGElement, unknown, null, undefined> | null;
    zoom: d3.ZoomBehavior<SVGSVGElement, unknown> | null;
  }>({ svg: null, g: null, zoom: null });

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  const [activeNode, setActiveNode] = useState<{ id: string; x: number; y: number } | null>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({ opacity: 0, pointerEvents: 'none' });
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);

  const { language, t } = useTranslation();
  const isMobile = dimensions.width < 768;

  // Refs for "View in Full Tree" feature
  const pinnedNodeScreenPosition = useRef<{ x: number; y: number } | null>(null);
  const prevFocusedContactId = useRef<string | null>(focusedContactId);
  
  // Setup SVG, zoom, and resize observer once
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current)
      .style('touch-action', 'none'); // Prevents browser interference with pinch-zoom

    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 2])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setActiveNode(null);
      });
    
    svg.call(zoom);
    
    svg.on('dblclick.zoom', null); // Disable double-click zoom to handle it on nodes

    chartRef.current = { svg, g, zoom };

    const observer = new ResizeObserver(entries => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setDimensions({ width, height });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);


  // Update dimensions and viewBox
  useEffect(() => {
    if (!chartRef.current.svg) return;
    const { width, height } = dimensions;
    chartRef.current.svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [-width / 2, -height / 4, width, height]);
  }, [dimensions]);

  // Update menu position
  useEffect(() => {
    if (!activeNode) {
        setMenuStyle(prev => ({ ...prev, opacity: 0, pointerEvents: 'none' }));
        return;
    }
    const menuWidth = 140; 
    const menuHeight = 80;
    const { width: containerWidth } = dimensions;

    let top = activeNode.y;
    let left = activeNode.x;
    let transform = 'translate(-50%, -120%)';

    if (activeNode.y - menuHeight < 0) {
        transform = 'translate(-50%, 60px)'; 
    }
    if (activeNode.x - menuWidth / 2 < 0) {
        left = menuWidth / 2 + 10;
    }
    if (activeNode.x + menuWidth / 2 > containerWidth) {
        left = containerWidth - menuWidth / 2 - 10;
    }

    setMenuStyle({
        position: 'absolute',
        top: `${top}px`,
        left: `${left}px`,
        transform,
        opacity: 1,
        transition: 'opacity 0.2s ease-in-out',
        pointerEvents: 'auto',
    });
  }, [activeNode, dimensions]);

  // Use a layout effect to capture the node's position just before the focused view disappears.
  useLayoutEffect(() => {
    // Check if we are transitioning from a focused state to a full tree with pinning enabled.
    if (prevFocusedContactId.current && !focusedContactId && nodeToPin && chartRef.current.svg && rootRef.current) {
      const svgNode = chartRef.current.svg.node();
      if (!svgNode) return;

      const nodeData = rootRef.current.find(n => n.data.id === nodeToPin);
      
      if (nodeData) {
        const { x, y } = nodeData as PointNode;
        const transform = d3.zoomTransform(svgNode);
        const [screenX, screenY] = transform.apply([x, y]);
        pinnedNodeScreenPosition.current = { x: screenX, y: screenY };
      }
    }
    
    // Update the ref for the next render.
    prevFocusedContactId.current = focusedContactId;
  }, [focusedContactId, nodeToPin]);

  // D3 render/update effect
  useEffect(() => {
    const { g } = chartRef.current;
    if (!g || dimensions.width === 0) return;
    
    const nodeWidth = isMobile ? 120 : 160;
    const nodeHeight = isMobile ? 200 : 240;
    const outerRadius = isMobile ? 40 : 50;
    const textDy = isMobile ? '50px' : '60px';
    const fontSize = isMobile ? '12px' : '14px';

    const isHighlighting = connectionPath && connectionPath.nodes.length > 0;
    const pathNodeSet = isHighlighting ? new Set(connectionPath.nodes) : new Set();
    
    const familyContacts = focusedContactId 
      ? contacts 
      : contacts.filter(c => (c.includeInFamilyTree ?? true) || pathNodeSet.has(c.id));
    
    g.selectAll('*').remove();

    if (familyContacts.length === 0) {
      g.append('text').attr('class', 'no-data-text').attr('text-anchor', 'middle').attr('fill', '#9ca3af').text(t('No Data'));
      return;
    }

    const allContactsMap: Map<string, Contact> = new Map(contacts.map(c => [c.id, c]));
    const contactsMap: Map<string, ContactNode> = new Map(familyContacts.map(c => [c.id, { ...c, children: [] as ContactNode[] }]));
    
    const parentToChildren = new Map<string, ContactNode[]>();

    familyContacts.forEach(c => {
        if (c.parentIds?.length) {
            const fatherId = c.parentIds.find(pId => contactsMap.get(pId)?.gender === 'Male');
            const parentId = fatherId || c.parentIds[0];
            const childNode = contactsMap.get(c.id);

            if (parentId && childNode && contactsMap.has(parentId)) {
                if (!parentToChildren.has(parentId)) {
                    parentToChildren.set(parentId, []);
                }
                parentToChildren.get(parentId)!.push(childNode);
            }
        }
    });

    parentToChildren.forEach((children, parentId) => {
        const parentNode = contactsMap.get(parentId);
        if (parentNode) {
            children.sort((a, b) => (a.siblingOrder ?? 999) - (b.siblingOrder ?? 999));
            parentNode.children = children;
        }
    });
    
    const rootNodes = familyContacts.filter(c => !c.parentIds?.length || !c.parentIds.some(pId => contactsMap.has(pId)));
    
    if (rootNodes.length === 0 && familyContacts.length > 0) {
      g.append('text').attr('class', 'no-data-text').attr('text-anchor', 'middle').attr('fill', '#9ca3af').text(t('No Root Nodes'));
      return;
    }

    const rootNodesData = rootNodes.map(node => contactsMap.get(node.id)).filter(Boolean) as ContactNode[];
    const dummyRootData: ContactNode = {
      id: 'dummy-root',
      firstNameEn: '', lastNameEn: '', familyName: '', avatar: '', gender: 'Male',
      children: rootNodesData,
    };
    
    const superRoot = d3.hierarchy(dummyRootData, d => d.children);
    const treeLayout = d3.tree<ContactNode>().nodeSize([nodeWidth, nodeHeight]);
    treeLayout(superRoot);
    rootRef.current = superRoot as PointNode;

    const descendants = superRoot.descendants().slice(1) as PointNode[];

    if (focusedContactId) {
        const nodesById = new Map(descendants.map(d => [d.data.id, d]));

        // Run multiple iterations to allow the layout to settle into a balanced state.
        for (let iter = 0; iter < 60; iter++) {

            // Pass 1: Enforce Parent-Child Vertical Hierarchy.
            descendants.forEach(childNode => {
                const parentIds = childNode.data.parentIds || [];
                parentIds.forEach(pId => {
                    const parentNode = nodesById.get(pId);
                    if (parentNode && parentNode.y >= childNode.y) {
                        parentNode.y = childNode.y - nodeHeight;
                    }
                });
            });

            // Pass 2: Align Spouses on the same Y-level.
            descendants.forEach(node => {
                if (node.data.spouseId && (node.data.relationStatus === 'Married' || node.data.relationStatus === 'Divorced')) {
                    const spouseNode = nodesById.get(node.data.spouseId);
                    if (spouseNode) {
                        const avgY = (node.y + spouseNode.y) / 2;
                        node.y = avgY;
                        spouseNode.y = avgY;
                    }
                }
            });

            // Pass 3: Align Co-Parents. This is a stronger layout rule that ensures the mother and father 
            // of a set of children appear on the same horizontal level.
            descendants.forEach(childNode => {
                const parentIds = childNode.data.parentIds || [];
                if (parentIds.length > 1) {
                    const parentNodes = parentIds
                        .map(pId => nodesById.get(pId))
                        .filter((p): p is PointNode => !!p);

                    if (parentNodes.length > 1) {
                        // All parents of a child should be on the same level.
                        const avgY = parentNodes.reduce((sum, p) => sum + p.y, 0) / parentNodes.length;
                        parentNodes.forEach(pNode => {
                            pNode.y = avgY;
                        });
                    }
                }
            });

            // Pass 4: Group children by co-parent and arrange them horizontally to prevent overlap.
            const parentToChildrenGroups = new Map<string, Map<string, PointNode[]>>();
            // First, find all children for each parent and group them by their *other* parent.
            descendants.forEach(node => {
                if (!node.data.parentIds) return;

                node.data.parentIds.forEach(pId => {
                    if (!nodesById.has(pId)) return; // Ensure parent is in the current view
                    if (!parentToChildrenGroups.has(pId)) {
                        parentToChildrenGroups.set(pId, new Map<string, PointNode[]>());
                    }
                    const childrenGroups = parentToChildrenGroups.get(pId)!;
                    // The key for the group is the other parent(s), or a placeholder if none.
                    const coParentKey = (node.data.parentIds || []).filter(id => id !== pId).sort().join(',') || 'unknown_coparent';
                    
                    if (!childrenGroups.has(coParentKey)) {
                        childrenGroups.set(coParentKey, []);
                    }
                    childrenGroups.get(coParentKey)!.push(node);
                });
            });

            // Now, iterate over each parent and arrange their children's groups horizontally.
            parentToChildrenGroups.forEach((childrenGroups, pId) => {
                const parentNode = nodesById.get(pId);
                if (!parentNode) return;

                const groupSpacing = nodeWidth * 0.5; // Space between different sibling groups
                let totalWidth = 0;
                const groupLayouts: { key: string; siblings: PointNode[]; width: number }[] = [];

                // Sort groups for a consistent layout order (e.g., by the first child's birth order).
                const sortedGroupKeys = Array.from(childrenGroups.keys()).sort((a, b) => {
                    const firstChildA = childrenGroups.get(a)!.sort((sa, sb) => (sa.data.siblingOrder ?? 999) - (sb.data.siblingOrder ?? 999))[0];
                    const firstChildB = childrenGroups.get(b)!.sort((sa, sb) => (sa.data.siblingOrder ?? 999) - (sb.data.siblingOrder ?? 999))[0];
                    if (!firstChildA || !firstChildB) return 0;
                    return (firstChildA.data.siblingOrder ?? 999) - (firstChildB.data.siblingOrder ?? 999);
                });

                sortedGroupKeys.forEach(key => {
                    const siblings = childrenGroups.get(key)!;
                    siblings.sort((a, b) => (a.siblingOrder ?? 999) - (b.siblingOrder ?? 999));
                    const width = siblings.length * nodeWidth;
                    groupLayouts.push({ key, siblings, width });
                    totalWidth += width;
                });

                totalWidth += Math.max(0, groupLayouts.length - 1) * groupSpacing;

                // Center the entire block of children under the current parent.
                let startX = parentNode.x - totalWidth / 2;

                // Position each group and the siblings within it.
                groupLayouts.forEach(({ siblings, width }) => {
                    const itemWidth = nodeWidth;
                    siblings.forEach((sibling, index) => {
                        sibling.x = startX + (index * itemWidth) + (itemWidth / 2);
                    });
                    startX += width + groupSpacing;
                });
            });


            // Pass 5: Prevent node overlaps using circle-based collision detection.
            const collisionRadius = outerRadius + (isMobile ? 30 : 50); // Add padding to the visual radius

            descendants.forEach(node1 => {
                descendants.forEach(node2 => {
                    if (node1.data.id >= node2.data.id) return; // Process each pair only once

                    const dx = node2.x - node1.x;
                    const dy = node2.y - node1.y;
                    
                    const distanceSq = dx * dx + dy * dy;
                    const minDistance = collisionRadius * 2;

                    if (distanceSq < minDistance * minDistance && distanceSq > 0) {
                        const distance = Math.sqrt(distanceSq);
                        const overlap = minDistance - distance;
                        
                        // Calculate push vector
                        const pushX = (dx / distance) * overlap * 0.5; // * 0.5 to split push between two nodes
                        const pushY = (dy / distance) * overlap * 0.5;

                        // Dampen vertical push to preserve generational alignment from earlier passes
                        const verticalDampening = 0.7;

                        node1.x -= pushX;
                        node1.y -= pushY * verticalDampening;
                        node2.x += pushX;
                        node2.y += pushY * verticalDampening;
                    }
                });
            });
        }
    }
    
    // --- DEFS for Image Patterns and Filters ---
    const defs = g.append('defs');
    
    // Glow filter for highlights
    const filter = defs.append('filter')
        .attr('id', 'glow')
        .attr('x', '-50%').attr('y', '-50%')
        .attr('width', '200%').attr('height', '200%');
    filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Filter for nodes that have an avatar URL
    const nodesWithAvatars = descendants.filter(d => d.data.avatar);
    
    // Create a pattern for each avatar
    const patterns = defs.selectAll('.avatar-pattern')
        .data(nodesWithAvatars, d => d.data.id)
        .enter()
        .append('pattern')
        .attr('class', 'avatar-pattern')
        .attr('id', d => `pattern-${d.data.id}`)
        .attr('height', 1)
        .attr('width', 1)
        .attr('patternContentUnits', 'objectBoundingBox');

    // Add a fallback color rectangle to each pattern
    patterns.append('rect')
        .attr('width', 1)
        .attr('height', 1)
        .attr('fill', d => generationColors[(d.depth - 1) % generationColors.length]);

    // Add the image to each pattern, which will cover the fallback rect if it loads
    patterns.append('image')
        .attr('href', d => d.data.avatar)
        .attr('height', 1)
        .attr('width', 1)
        .attr('preserveAspectRatio', 'xMidYMid slice')
        .attr('referrerpolicy', 'no-referrer');

    const links = superRoot.links().filter(link => link.source.data.id !== 'dummy-root');
    const transition = d3.transition().duration(500);

    const pathLinkSet = isHighlighting ? new Set(connectionPath.links.map(p => `${p[0]}-${p[1]}`)) : new Set();

    // --- Links ---
    const linkSelection = g.selectAll<SVGGElement, d3.HierarchyLink<ContactNode>>('.link-group').data(links, d => `${d.source.data.id}-${d.target.data.id}`);

    linkSelection.exit().remove();
    
    const linkEnter = linkSelection.enter().append('g').attr('class', 'link-group');

    linkEnter.append('path')
      .attr('class', 'base-link')
      .attr('fill', 'none')
      .attr('d', (d: d3.HierarchyLink<ContactNode>) => {
        const source = d.source as PointNode;
        const target = d.target as PointNode;
        const midY = (source.y + target.y) / 2;
        return `M${source.x},${source.y} V${midY} H${target.x} V${target.y}`;
      });
      
    const linkUpdate = linkEnter.merge(linkSelection);
    
    linkUpdate.select('.base-link')
      .transition(transition)
      .attr('stroke', d => (pathLinkSet.has(`${d.source.data.id}-${d.target.data.id}`)) ? '#f59e0b' : '#4b5563')
      .attr('stroke-width', d => (pathLinkSet.has(`${d.source.data.id}-${d.target.data.id}`)) ? 4 : 2)
      .style('opacity', d => (isHighlighting && !pathLinkSet.has(`${d.source.data.id}-${d.target.data.id}`)) ? 0.2 : 1)
      .attr('d', d => {
        const source = d.source as PointNode;
        const target = d.target as PointNode;
        const midY = (source.y + target.y) / 2;
        return `M${source.x},${source.y} V${midY} H${target.x} V${target.y}`;
      });

    // --- Spouse & Maternal Links (visible in Focus Mode or when highlighting a connection) ---
    if (focusedContactId || isHighlighting) {
      const nodesById = new Map(descendants.map(d => [d.data.id, d]));

      // --- Spouse Links ---
      const spouseLinksData = contacts
        .filter(c => c.spouseId && c.id < c.spouseId! && c.relationStatus !== 'Divorced') 
        .map(c => ({
          source: nodesById.get(c.id),
          target: nodesById.get(c.spouseId!)
        }))
        .filter((link): link is { source: PointNode; target: PointNode } => !!(link.source && link.target));

      const spouseLinkSelection = g.selectAll('.spouse-link').data(spouseLinksData, d => `${d.source.data.id}-${d.target.data.id}`);

      spouseLinkSelection.exit().remove();

      const spouseLinkEnter = spouseLinkSelection.enter()
        .append('path')
        .attr('class', 'spouse-link')
        .attr('fill', 'none')
        .attr('stroke', '#818cf8')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '2 5');

      spouseLinkEnter.merge(spouseLinkSelection)
        .transition(transition)
        .attr('d', d => `M${d.source.x},${d.source.y} L${d.target.x},${d.target.y}`);

      // --- Maternal Links ---
      const maternalLinksData = familyContacts
        .flatMap(child => {
          const motherId = child.parentIds?.find(pId => allContactsMap.get(pId)?.gender === 'Female');
          if (!motherId) return [];

          const motherNode = nodesById.get(motherId);
          const childNode = nodesById.get(child.id);
          
          if (motherNode && childNode) {
            return [{
              source: motherNode, // mother
              target: childNode  // child
            }];
          }
          return [];
        });

      const maternalLinkSelection = g.selectAll('.maternal-link').data(maternalLinksData, d => `${d.source.data.id}-${d.target.data.id}`);

      maternalLinkSelection.exit().remove();

      const maternalLinkEnter = maternalLinkSelection.enter()
        .append('path')
        .attr('class', 'maternal-link')
        .attr('fill', 'none')
        .attr('stroke-dasharray', '8 4');

      maternalLinkEnter.merge(maternalLinkSelection)
        .transition(transition)
        .attr('stroke', d => (pathLinkSet.has(`${d.source.data.id}-${d.target.data.id}`)) ? '#f59e0b' : '#4b5563')
        .attr('stroke-width', d => (pathLinkSet.has(`${d.source.data.id}-${d.target.data.id}`)) ? 4 : 2)
        .style('opacity', d => (isHighlighting && !pathLinkSet.has(`${d.source.data.id}-${d.target.data.id}`)) ? 0.2 : 1)
        .attr('d', d => {
            const source = d.source; // mother
            const target = d.target; // child
            const midY = (source.y + target.y) / 2 + 20; // Add offset to avoid overlap with paternal line
            return `M${source.x},${source.y} V${midY} H${target.x} V${target.y}`;
        });
    }


    // --- Nodes ---
    const nodeSelection = g.selectAll<SVGGElement, PointNode>('.node').data(descendants, d => d.data.id);
    
    nodeSelection.exit().transition(transition).attr('transform', d => `translate(${d.x}, ${d.y}) scale(0)`).remove();

    const nodeEnter = nodeSelection.enter().append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.x}, ${d.y}) scale(0)`);

    // The single circle that will be filled with a photo or a solid color
    nodeEnter.append('circle').attr('class', 'main-circle')
      .attr('r', outerRadius);

    // Name text below the node
    nodeEnter.append('text').attr('dy', textDy).attr('text-anchor', 'middle');
    
    const nodeUpdate = nodeEnter.merge(nodeSelection)
      .style('cursor', isHighlighting ? 'default' : 'pointer')
      .style('opacity', d => (isHighlighting && !pathNodeSet.has(d.data.id)) ? 0.2 : 1);
      
    // Refactored robust touch/click handling
    nodeUpdate.each(function(d: PointNode) {
      const node = d3.select(this);
      
      // State variables scoped to each node to handle gestures
      let pressTimer: number | null = null;
      let pointerStartPos: { x: number; y: number } | null = null;
      let lastTapTimestamp = 0;
      const doubleTapThreshold = 300; // ms
      const longPressThreshold = 500; // ms
      const panThreshold = 5; // pixels

      // --- Gesture Actions ---
      const openContextMenu = () => {
          const transform = d3.zoomTransform(svgRef.current!);
          const [screenX, screenY] = transform.apply([d.x, d.y]);
          
          // Toggle the menu for the current node
          setActiveNode(prev => (prev?.id === d.data.id) ? null : { id: d.data.id, x: screenX, y: screenY });
      };

      const focusOnNode = () => {
          onFocusContact(d.data.id);
          setActiveNode(null);
      };

      // --- Event Handlers ---
      const onPointerDown = (event: PointerEvent) => {
          // Ignore if it's a right-click or if a connection path is highlighted (disabling interactions)
          if (event.button !== 0 || isHighlighting) return;

          pointerStartPos = { x: event.clientX, y: event.clientY };
          
          // Start a timer for the long press action
          pressTimer = window.setTimeout(() => {
              openContextMenu();
              
              // Nullify state to indicate the gesture has been handled
              pressTimer = null;
              pointerStartPos = null;
          }, longPressThreshold);
      };
      
      const onPointerMove = (event: PointerEvent) => {
          // If there's no active pointer down, ignore movement
          if (!pointerStartPos) return;
          
          const dx = event.clientX - pointerStartPos.x;
          const dy = event.clientY - pointerStartPos.y;
          
          // If the pointer has moved beyond the threshold, it's a pan, not a tap/press
          if (Math.sqrt(dx * dx + dy * dy) > panThreshold) {
              // Cancel the long press timer
              if (pressTimer) clearTimeout(pressTimer);
              
              // Nullify state to indicate the gesture is now a pan, handled by D3 zoom
              pressTimer = null;
              pointerStartPos = null;
          }
      };
      
      const onPointerUp = () => {
          // If the gesture was already handled (as a long press or pan), do nothing
          if (!pointerStartPos || !pressTimer) return;
          
          // If we got here, it's a tap, so clear the long press timer
          clearTimeout(pressTimer);
          pressTimer = null;
          
          const now = Date.now();
          const timeSinceLastTap = now - lastTapTimestamp;

          if (timeSinceLastTap < doubleTapThreshold && timeSinceLastTap > 0) {
              // --- Double Tap Action ---
              openContextMenu();
              lastTapTimestamp = 0; // Reset timestamp to prevent a third tap from being a double tap
          } else {
              // --- Single Tap Action ---
              focusOnNode();
              lastTapTimestamp = now; // Record timestamp for the next potential tap
          }
          
          // Reset the start position
          pointerStartPos = null;
      };
      
      // Clean up previous listeners and attach new ones
      node.on('pointerdown', onPointerDown)
          .on('pointermove', onPointerMove)
          .on('pointerup', onPointerUp);
    });

    nodeUpdate.transition(transition).attr('transform', d => `translate(${d.x},${d.y}) scale(1)`);
    
    nodeUpdate.select('.main-circle')
      .attr('fill', d => {
        // Use the image pattern if an avatar exists, otherwise use the generation color as a fallback.
        return d.data.avatar ? `url(#pattern-${d.data.id})` : generationColors[(d.depth - 1) % generationColors.length];
      })
      .attr('stroke', d => {
        // The stroke acts as the frame. Use highlight colors or the generation color.
        if (d.data.id === focusedContactId) return '#ec4899'; // pink-500
        if (pathNodeSet.has(d.data.id)) return '#f59e0b';
        return generationColors[(d.depth - 1) % generationColors.length];
      })
      .attr('stroke-width', d => (d.data.id === focusedContactId || pathNodeSet.has(d.data.id)) ? 4 : 3);
      
    nodeUpdate.select('text')
      .attr('fill', '#f9fafb')
      .style('font-size', fontSize)
      .style('font-weight', '600')
      .style('font-family', language === 'ar' ? 'Tahoma, Arial, sans-serif' : 'Inter, sans-serif')
      .text(d => language === 'ar' ? d.data.firstNameAr || d.data.firstNameEn : d.data.firstNameEn);

    // Handle the "view in full tree" transition
    if (nodeToPin && pinnedNodeScreenPosition.current) {
        const { svg, zoom } = chartRef.current;
        const targetScreenPos = pinnedNodeScreenPosition.current;

        // Find the same node in the new, full-tree layout
        const targetNode = rootRef.current?.find(n => n.data.id === nodeToPin);
        
        if (svg && zoom && targetNode) {
            const { x: targetX, y: targetY } = targetNode as PointNode;
            const currentTransform = d3.zoomTransform(svg.node()!);
            const scale = currentTransform.k;

            const tx = targetScreenPos.x - targetX * scale;
            const ty = targetScreenPos.y - targetY * scale;

            const newTransform = d3.zoomIdentity.translate(tx, ty).scale(scale);
            
            svg.transition()
               .duration(750)
               .call(zoom.transform, newTransform)
               .on('end', () => {
                   onPinComplete();
                   pinnedNodeScreenPosition.current = null;
               });

        } else {
            onPinComplete();
            pinnedNodeScreenPosition.current = null;
        }
    }

  }, [contacts, dimensions, language, t, connectionPath, onFocusContact, focusedContactId, isMobile, nodeToPin, onPinComplete]);
  
  // Effect to fit tree to screen on button click or other triggers
  useEffect(() => {
    if (fitTrigger === 0) return;
    const { svg, zoom } = chartRef.current;
    if (!svg || !zoom || dimensions.width === 0) return;

    const g = svg.select<SVGGElement>("g");
    const { width, height } = dimensions;
    if (g.empty()) return;

    let totalBBox: { x: number; y: number; width: number; height: number; } | null = null;

    if (connectionPath && connectionPath.nodes.length > 0) {
        // --- Fit to connection path ---
        const pathNodeSet = new Set(connectionPath.nodes);
        const nodesToFit = g.selectAll<SVGGElement, PointNode>('.node').filter(d => pathNodeSet.has(d.data.id));

        if (!nodesToFit.empty()) {
            nodesToFit.each(function() {
                const nodeBBox = this.getBBox();
                if (!totalBBox) {
                    totalBBox = { x: nodeBBox.x, y: nodeBBox.y, width: nodeBBox.width, height: nodeBBox.height };
                } else {
                    const minX = Math.min(totalBBox.x, nodeBBox.x);
                    const minY = Math.min(totalBBox.y, nodeBBox.y);
                    const maxX = Math.max(totalBBox.x + totalBBox.width, nodeBBox.x + nodeBBox.width);
                    const maxY = Math.max(totalBBox.y + totalBBox.height, nodeBBox.y + nodeBBox.height);
                    totalBBox.x = minX;
                    totalBBox.y = minY;
                    totalBBox.width = maxX - minX;
                    totalBBox.height = maxY - minY;
                }
            });
        }
    } else {
        // --- Fit to all nodes ---
        if (!g.selectAll('.node').empty()) {
            totalBBox = g.node()!.getBBox();
        }
    }
    
    if (!totalBBox || totalBBox.width === 0 || totalBBox.height === 0) return;
    
    const padding = isMobile ? 80 : 150;
    const bounds = {
        x: totalBBox.x - padding / 2,
        y: totalBBox.y - padding / 2,
        width: totalBBox.width + padding,
        height: totalBBox.height + padding,
    };

    const scale = Math.min(width / bounds.width, height / bounds.height) * 0.95;
    const tx = -(bounds.x + bounds.width / 2) * scale + (width / 2);
    const ty = -(bounds.y + bounds.height / 2) * scale + (height / 2);

    const transform = d3.zoomIdentity.translate(tx, ty).scale(scale);
    svg.transition().duration(750).call(zoom.transform, transform);
  }, [fitTrigger, dimensions, connectionPath, isMobile]);

  // Effect to center on a specific node when requested (e.g., from search)
  useEffect(() => {
    if (!centerOnNodeId || !rootRef.current || !chartRef.current.svg || !chartRef.current.zoom || dimensions.height === 0) {
        if (centerOnNodeId) onCenterComplete(); // Ensure completion is called if we bail early
        return;
    }
    
    const { svg, zoom } = chartRef.current;
    const targetNode = rootRef.current.find(n => n.data.id === centerOnNodeId);

    if (targetNode) {
      const { x, y } = targetNode as PointNode;
      const currentTransform = d3.zoomTransform(svg.node()!);
      const scale = currentTransform.k; // Use current zoom level
      const { width, height } = dimensions;
      
      // Thoroughly revised centering logic.
      // This provides a simpler, more direct approach to vertical centering.
      // On mobile, we center lower on the screen (40% from top).
      // On desktop, we center higher to provide more space for descendants (25% from top).
      const verticalOffsetRatio = isMobile ? 0.4 : 0.25;
      const verticalOffset = height * verticalOffsetRatio;

      // The viewBox="[-width/2, -height/4, ...]" setting effectively translates the entire coordinate system.
      // The previous logic did not account for this, leading to inaccurate centering.
      // This revised calculation correctly incorporates the viewBox offset.
      // The goal is to find the translation (tx, ty) for the <g> element's transform.
      //
      // Screen X-coordinate mapping: screenX = (node.x * scale + tx) + (viewBox.width / 2)
      // We want screenX to be the center of the view (width / 2).
      // width / 2 = (x * scale + tx) + width / 2  =>  tx = -x * scale
      //
      // Screen Y-coordinate mapping: screenY = (node.y * scale + ty) + (viewBox.height / 4)
      // We want screenY to be our calculated verticalOffset.
      // verticalOffset = (y * scale + ty) + height / 4  =>  ty = -y * scale + verticalOffset - height / 4
      const tx = -x * scale;
      const ty = -y * scale + verticalOffset - (height / 4);
      
      const transform = d3.zoomIdentity.translate(tx, ty).scale(scale);
      svg.transition()
         .duration(750)
         .call(zoom.transform, transform)
         .on('end', onCenterComplete);
    } else {
      onCenterComplete();
    }
  }, [centerOnNodeId, dimensions, onCenterComplete, isMobile]);
  
  // Effect to animate a flow of light particles along the connection path
  useEffect(() => {
    const { g } = chartRef.current;
    if (!g) return;

    let particleInterval: d3.Timer | null = null;
    
    const cleanup = () => {
      if (particleInterval) particleInterval.stop();
      g.selectAll('.animation-path, .light-particle').remove();
    };

    cleanup();

    if (!connectionPath || !rootRef.current || !g.node()) {
        return;
    }
    
    const pathNodes = connectionPath.orderedPath
        .map(id => rootRef.current!.find(n => n.data.id === id))
        .filter((d): d is PointNode => !!d);

    if (pathNodes.length < 2) return;

    let pathData = `M${pathNodes[0].x},${pathNodes[0].y}`;
    for (let i = 0; i < pathNodes.length - 1; i++) {
        const startNode = pathNodes[i];
        const endNode = pathNodes[i + 1];
        const midY = (startNode.y + endNode.y) / 2;
        pathData += ` V${midY} H${endNode.x} V${endNode.y}`;
    }

    const animationPath = g.append('path')
        .attr('class', 'animation-path')
        .attr('d', pathData)
        .attr('fill', 'none')
        .attr('stroke', 'none');

    const pathNode = animationPath.node();
    if (!pathNode) return;

    const pathLength = pathNode.getTotalLength();
    if (pathLength === 0) return;
    
    const animateParticle = () => {
        const startPoint = pathNode.getPointAtLength(0);
        const particle = g.append('circle')
            .attr('class', 'light-particle')
            .attr('r', 8)
            .attr('fill', '#fde047')
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .style('filter', 'url(#glow)')
            .attr('transform', `translate(${startPoint.x}, ${startPoint.y})`);

        particle.transition()
            .duration(pathLength * 4)
            .ease(d3.easeLinear)
            .attrTween('transform', function() {
                return function(t) {
                    const point = pathNode.getPointAtLength(t * pathLength);
                    return `translate(${point.x}, ${point.y})`;
                };
            })
            .on('end', function() {
                d3.select(this).remove();
            });
    };
    
    animateParticle();
    particleInterval = d3.interval(animateParticle, 1500);

    return cleanup;
  }, [connectionPath]);

  const handleDeleteRequest = (contactId: string) => {
    setContactToDelete(contactId);
    setActiveNode(null);
  };

  const handleConfirmDelete = () => {
    if (contactToDelete) {
      onDeleteContact(contactToDelete);
    }
    setContactToDelete(null);
  };
  
  const handleZoomIn = () => {
    const { svg, zoom } = chartRef.current;
    if (!svg || !zoom) return;
    svg.transition().duration(500).call(zoom.scaleBy, 1.3);
  };

  const handleZoomOut = () => {
    const { svg, zoom } = chartRef.current;
    if (!svg || !zoom) return;
    svg.transition().duration(500).call(zoom.scaleBy, 1 / 1.3);
  };

  return (
    <div className="h-full w-full flex flex-col">
        <div ref={containerRef} className="flex-grow bg-gray-900 border border-white/10 rounded-2xl overflow-hidden relative shadow-lg">
            <svg ref={svgRef}></svg>
            {activeNode && (
                <div
                    style={menuStyle}
                    className="bg-slate-800 rounded-lg shadow-xl p-2 flex flex-col gap-1 z-10 border border-slate-700"
                    onClick={e => e.stopPropagation()}
                >
                    <button onClick={() => { onViewContact(activeNode.id); setActiveNode(null); }} className="text-left text-sm w-full px-3 py-1.5 rounded-md hover:bg-indigo-500/50 transition-colors text-gray-200">{t('View Details')}</button>
                    <button onClick={() => { onAddNewChild(activeNode.id); setActiveNode(null); }} className="text-left text-sm w-full px-3 py-1.5 rounded-md hover:bg-indigo-500/50 transition-colors text-gray-200">{t('Add New Child')}</button>
                    <div className="border-t border-slate-700 my-1"></div>
                    <button onClick={() => { onEditContact(activeNode.id); setActiveNode(null); }} className="text-left text-sm w-full px-3 py-1.5 rounded-md hover:bg-sky-500/50 transition-colors text-gray-200">{t('Edit Details')}</button>
                    <button 
                      onClick={() => handleDeleteRequest(activeNode.id)}
                      className="text-left text-sm w-full px-3 py-1.5 rounded-md hover:bg-red-500/50 transition-colors text-red-300"
                    >
                      {t('Delete')}
                    </button>
                </div>
            )}
            <div className={`absolute top-4 right-4 bg-gray-900/50 backdrop-blur-sm ${isMobile ? 'p-1.5' : 'p-2'} rounded-lg text-xs text-gray-400 border border-white/10`}>
                <p>{t('Zoom Pan Hint')}</p>
            </div>
             <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                <button
                    onClick={handleZoomIn}
                    aria-label="Zoom in"
                    className="w-10 h-10 rounded-full bg-gray-700/80 hover:bg-gray-600/80 text-white font-bold text-xl flex items-center justify-center transition-colors backdrop-blur-sm"
                >
                    +
                </button>
                <button
                    onClick={handleZoomOut}
                    aria-label="Zoom out"
                    className="w-10 h-10 rounded-full bg-gray-700/80 hover:bg-gray-600/80 text-white font-bold text-xl flex items-center justify-center transition-colors backdrop-blur-sm"
                >
                    -
                </button>
            </div>
            <div className={`absolute bottom-4 left-4 bg-gray-900/50 backdrop-blur-sm ${isMobile ? 'p-2' : 'p-3'} rounded-lg text-xs text-gray-400 border border-white/10`}>
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <svg width="30" height="4"><line x1="0" y1="2" x2="30" y2="2" stroke="#4b5563" strokeWidth="2"></line></svg>
                        <span>{t('Paternal Line')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                         <svg width="30" height="4"><line x1="0" y1="2" x2="30" y2="2" stroke="#4b5563" strokeWidth="2" strokeDasharray="8 4"></line></svg>
                        <span>{t('Maternal Line (on focus)')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                         <svg width="30" height="4"><line x1="0" y1="2" x2="30" y2="2" stroke="#818cf8" strokeWidth="2" strokeDasharray="2 5"></line></svg>
                        <span>{t('Spouse (on focus)')}</span>
                    </div>
                </div>
            </div>
            <ConfirmationModal
                isOpen={!!contactToDelete}
                onClose={() => setContactToDelete(null)}
                onConfirm={handleConfirmDelete}
                title={t('Delete Confirmation Title')}
            >
                <p>{t('Delete Confirmation')}</p>
            </ConfirmationModal>
        </div>
    </div>
  );
};

export default FamilyTree;