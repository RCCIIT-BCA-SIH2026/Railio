import { SpatialMapNode, SpatialMapEdge, StructuredEnvironment, SpatialCoordinates, DetectedNavObject } from './types';

export class LocalSpatialMap {
  private nodes: Map<string, SpatialMapNode> = new Map();
  private edges: SpatialMapEdge[] = [];
  private currentEnvironmentId: string = 'demo_home';
  private sessionLandmarks: Map<string, { landmark: DetectedNavObject; timestamp: number }> = new Map();

  constructor() {
    this.loadEnvironment('demo_home');
  }

  /**
   * Set the navigation destination as a RELATIVE offset from the session origin.
   *
   * This is the correct method to use with ARCore-relative navigation:
   *   - The user starts at origin (0, 0, 0)
   *   - When a door is visually detected at ~3m ahead, call:
   *     setDestinationRelative(0, 3, 'Door') → door_1 becomes {x:0, y:0, z:-3}
   *
   * ARCore: negative Z = forward (camera looks toward -Z)
   * So: if the door is 3m ahead, its ARCore-relative Z is approximately -3.
   *
   * @param relX  Lateral offset (meters, right = positive)
   * @param relZForward  Forward distance (meters, positive = forward away from user)
   * @param label  Human-readable label for the destination
   */
  public setDestinationRelative(relX: number, relZForward: number, label: string = 'Destination'): void {
    // Clear existing nodes and edges so it's a purely relative map
    this.nodes.clear();
    this.edges = [];

    // In ARCore space: forward = negative Z, so navZ = -relZForward
    const navZ = -Math.abs(relZForward);
    const destNode: SpatialMapNode = {
      id: 'relative_dest',
      type: 'exit',
      name: label,
      coordinates: { x: relX, y: 0, z: navZ },
      visualAnchors: [label],
    };
    this.nodes.set('origin', {
      id: 'origin',
      type: 'room',
      name: 'Start',
      coordinates: { x: 0, y: 0, z: 0 },
    });
    this.nodes.set('relative_dest', destNode);
    this.edges = [{ from: 'origin', to: 'relative_dest', distance: relZForward, walkable: true }];
    console.log(`[LocalSpatialMap] Relative destination set: ${label} at (${relX}, 0, ${navZ.toFixed(2)}) — ${relZForward.toFixed(1)}m ahead`);
  }

  /**
   * Returns true if a relative destination has been set via setDestinationRelative().
   */
  public hasRelativeDestination(): boolean {
    return this.nodes.has('relative_dest');
  }

  /**
   * Clear the relative destination and revert to the pre-mapped environment.
   */
  public clearRelativeDestination(): void {
    this.loadEnvironment(this.currentEnvironmentId);
  }

  public loadEnvironment(envId: string): void {
    this.currentEnvironmentId = envId;
    this.nodes.clear();
    this.edges = [];
    this.sessionLandmarks.clear();

    const env = this.getDefaultEnvironment(envId);
    env.nodes.forEach(node => this.nodes.set(node.id, node));
    this.edges = [...env.edges];
  }

  public getDefaultEnvironment(envId: string): StructuredEnvironment {
    if (envId === 'demo_home' || envId === 'indoor_room') {
      return {
        environmentId: 'demo_home',
        name: 'Indoor Room Space',
        nodes: [
          { id: 'room_1', type: 'room', name: 'Your Room', coordinates: { x: 0, y: 0, z: 0 }, visualAnchors: ['Room Door', 'Doorway'] },
          { id: 'door_1', type: 'exit', name: 'Room Doorway / Exit', coordinates: { x: 1.5, y: 0, z: 0 }, visualAnchors: ['Doorway'] },
          { id: 'corridor_1', type: 'corridor', name: 'Hallway Passage', coordinates: { x: 4.5, y: 0, z: 0 } },
        ],
        edges: [
          { from: 'room_1', to: 'door_1', distance: 1.5, walkable: true },
          { from: 'door_1', to: 'corridor_1', distance: 3.0, walkable: true },
        ]
      };
    }

    // Station Concourse & Platforms
    return {
      environmentId: 'demo_railway_station',
      name: 'Railway Station Concourse',
      nodes: [
        { id: 'concourse_start', type: 'room', name: 'Main Concourse Hub', coordinates: { x: 0, y: 0, z: 0 }, visualAnchors: ['Central Clock', 'Train Schedule Board'] },
        { id: 'door_concourse_east', type: 'door', name: 'Platform 1-4 Gateway', coordinates: { x: 5, y: 0, z: 0 }, visualAnchors: ['Blue Overhead Sign'] },
        { id: 'corridor_access', type: 'corridor', name: 'Central Access Corridor', coordinates: { x: 12, y: 0, z: 0 } },
        { id: 'junction_platform_4', type: 'junction', name: 'Platform 4 Turnoff Junction', coordinates: { x: 18, y: 0, z: 0 }, visualAnchors: ['Platform 4 Sign'] },
        { id: 'stairs_footover', type: 'stairs', name: 'Footover Bridge Stairs', coordinates: { x: 18, y: 6, z: 0 }, isStairs: true },
        { id: 'lift_footover', type: 'elevator', name: 'Passenger Elevator / Lift', coordinates: { x: 18, y: -4, z: 0 }, isLift: true },
        { id: 'platform_4_target', type: 'platform', name: 'Platform 4 Boarding Area', coordinates: { x: 26, y: 0, z: 0 }, visualAnchors: ['Platform 4 Coach Marker'] },
        { id: 'exit_main_gate', type: 'exit', name: 'Main Station Exit & Cab Stand', coordinates: { x: 14, y: -9, z: 0 }, visualAnchors: ['Green Exit Sign'] },
        { id: 'emergency_exit_east', type: 'emergency_exit', name: 'East Emergency Exit Door', coordinates: { x: 7, y: 5, z: 0 }, isEmergency: true, visualAnchors: ['Red Emergency Sign'] }
      ],
      edges: [
        { from: 'concourse_start', to: 'door_concourse_east', distance: 5, walkable: true },
        { from: 'door_concourse_east', to: 'corridor_access', distance: 7, walkable: true },
        { from: 'corridor_access', to: 'junction_platform_4', distance: 6, walkable: true },
        { from: 'junction_platform_4', to: 'stairs_footover', distance: 6, walkable: true, isStairs: true },
        { from: 'junction_platform_4', to: 'lift_footover', distance: 4, walkable: true, isLift: true },
        { from: 'junction_platform_4', to: 'platform_4_target', distance: 8, walkable: true },
        { from: 'door_concourse_east', to: 'emergency_exit_east', distance: 6, walkable: true, isEmergency: true },
        { from: 'corridor_access', to: 'exit_main_gate', distance: 10, walkable: true }
      ]
    };
  }

  public findNearestNode(position: SpatialCoordinates): SpatialMapNode | null {
    let nearest: SpatialMapNode | null = null;
    let minDistance = Infinity;

    for (const node of this.nodes.values()) {
      const dx = node.coordinates.x - position.x;
      const dz = node.coordinates.z - position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = node;
      }
    }
    return nearest;
  }

  public findTargetNode(targetQuery: string, preferences?: { avoidStairs?: boolean; preferLift?: boolean; isEmergency?: boolean }): SpatialMapNode | null {
    const q = targetQuery.toLowerCase();

    if (preferences?.isEmergency || q.includes('emergency')) {
      for (const node of this.nodes.values()) {
        if (node.type === 'emergency_exit' || node.isEmergency) return node;
      }
    }

    if (q.includes('exit') || q.includes('outside') || q.includes('way out') || q.includes('gate')) {
      for (const node of this.nodes.values()) {
        if (node.type === 'exit') return node;
      }
    }

    if (q.includes('platform') || q.includes('train')) {
      for (const node of this.nodes.values()) {
        if (node.type === 'platform') return node;
      }
    }

    if (q.includes('lift') || q.includes('elevator')) {
      for (const node of this.nodes.values()) {
        if (node.type === 'elevator') return node;
      }
    }

    if (q.includes('stair') || q.includes('bridge')) {
      for (const node of this.nodes.values()) {
        if (node.type === 'stairs') return node;
      }
    }

    // Default fallback to first exit or platform
    for (const node of this.nodes.values()) {
      if (node.type === 'exit' || node.type === 'platform') return node;
    }

    return Array.from(this.nodes.values())[this.nodes.size - 1] || null;
  }

  /**
   * Deterministic Shortest-Path Graph Solver (Dijkstra algorithm)
   */
  public calculatePath(
    startNodeId: string,
    targetNodeId: string,
    preferences: { avoidStairs?: boolean; preferLift?: boolean } = {}
  ): SpatialMapNode[] {
    if (!this.nodes.has(startNodeId) || !this.nodes.has(targetNodeId)) {
      return [];
    }

    if (startNodeId === targetNodeId) {
      return [this.nodes.get(startNodeId)!];
    }

    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set<string>();

    for (const id of this.nodes.keys()) {
      distances.set(id, Infinity);
      previous.set(id, null);
      unvisited.add(id);
    }
    distances.set(startNodeId, 0);

    while (unvisited.size > 0) {
      let currentId: string | null = null;
      let minDis = Infinity;

      for (const id of unvisited) {
        const d = distances.get(id)!;
        if (d < minDis) {
          minDis = d;
          currentId = id;
        }
      }

      if (!currentId || minDis === Infinity || currentId === targetNodeId) {
        break;
      }

      unvisited.delete(currentId);

      // Inspect adjacent edges (bidirectional navigation)
      const outgoingEdges = this.edges.filter(
        e => (e.from === currentId || e.to === currentId) && e.walkable
      );

      for (const edge of outgoingEdges) {
        const neighborId = edge.from === currentId ? edge.to : edge.from;
        if (!unvisited.has(neighborId)) continue;

        let weight = edge.distance;
        if (preferences.avoidStairs && edge.isStairs) {
          weight += 100; // Heavily penalize stairs if user requests step-free access
        }
        if (preferences.preferLift && edge.isLift) {
          weight = Math.max(1, weight * 0.5); // Favor elevators
        }

        const alt = distances.get(currentId)! + weight;
        if (alt < distances.get(neighborId)!) {
          distances.set(neighborId, alt);
          previous.set(neighborId, currentId);
        }
      }
    }

    // Reconstruct path
    const path: SpatialMapNode[] = [];
    let curr: string | null = targetNodeId;
    while (curr) {
      const node = this.nodes.get(curr);
      if (node) path.unshift(node);
      curr = previous.get(curr) || null;
    }

    return path.length > 0 && path[0].id === startNodeId ? path : [];
  }

  /**
   * Temporary Session Landmark Memory
   */
  public registerObservedLandmark(obj: DetectedNavObject): void {
    if (!this.sessionLandmarks.has(obj.id)) {
      this.sessionLandmarks.set(obj.id, {
        landmark: obj,
        timestamp: Date.now()
      });
    }
  }

  public getObservedLandmarks(): DetectedNavObject[] {
    return Array.from(this.sessionLandmarks.values()).map(entry => entry.landmark);
  }

  public getAllNodes(): SpatialMapNode[] {
    return Array.from(this.nodes.values());
  }
}

export const localSpatialMap = new LocalSpatialMap();
