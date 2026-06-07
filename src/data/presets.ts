import { SavedPreset } from '../types';

export const travelMapPreset: SavedPreset = {
  name: 'Bản Đồ Thành Phố Việt Nam',
  nodes: [
    { id: 'HN', label: 'HN', x: 250, y: 80 },
    { id: 'V', label: 'V', x: 230, y: 180 },
    { id: 'H', label: 'H', x: 300, y: 260 },
    { id: 'DN', label: 'DN', x: 340, y: 310 },
    { id: 'QN', label: 'QN', x: 380, y: 410 },
    { id: 'NT', label: 'NT', x: 400, y: 500 },
    { id: 'DL', label: 'DL', x: 320, y: 530 },
    { id: 'SG', label: 'SG', x: 280, y: 620 },
  ],
  edges: [
    { id: 'e1', source: 'HN', target: 'V', weight: 300 },
    { id: 'e2', source: 'HN', target: 'H', weight: 650 },
    { id: 'e3', source: 'V', target: 'H', weight: 360 },
    { id: 'e4', source: 'H', target: 'DN', weight: 100 },
    { id: 'e5', source: 'DN', target: 'QN', weight: 320 },
    { id: 'e6', source: 'DN', target: 'DL', weight: 650 },
    { id: 'e7', source: 'QN', target: 'NT', weight: 220 },
    { id: 'e8', source: 'DL', target: 'SG', weight: 300 },
    { id: 'e9', source: 'NT', target: 'SG', weight: 430 },
    { id: 'e10', source: 'NT', target: 'DL', weight: 140 },
    { id: 'e11', source: 'QN', target: 'DL', weight: 350 },
  ],
};

export const diamondPreset: SavedPreset = {
  name: 'Đồ Thị Hình Kim Cương',
  nodes: [
    { id: 'A', label: 'A', x: 100, y: 350 },
    { id: 'B', label: 'B', x: 300, y: 150 },
    { id: 'C', label: 'C', x: 300, y: 550 },
    { id: 'D', label: 'D', x: 500, y: 200 },
    { id: 'E', label: 'E', x: 500, y: 500 },
    { id: 'F', label: 'F', x: 700, y: 350 },
  ],
  edges: [
    { id: 'e101', source: 'A', target: 'B', weight: 4 },
    { id: 'e102', source: 'A', target: 'C', weight: 2 },
    { id: 'e103', source: 'B', target: 'C', weight: 1 },
    { id: 'e104', source: 'B', target: 'D', weight: 5 },
    { id: 'e105', source: 'C', target: 'E', weight: 8 },
    { id: 'e106', source: 'B', target: 'E', weight: 11 },
    { id: 'e107', source: 'C', target: 'D', weight: 8 },
    { id: 'e108', source: 'D', target: 'E', weight: 2 },
    { id: 'e109', source: 'D', target: 'F', weight: 6 },
    { id: 'e110', source: 'E', target: 'F', weight: 3 },
  ],
};

export const standardCyclePreset: SavedPreset = {
  name: 'Vòng Lặp Cơ Bản',
  nodes: [
    { id: '1', label: '1', x: 150, y: 250 },
    { id: '2', label: '2', x: 350, y: 150 },
    { id: '3', label: '3', x: 350, y: 450 },
    { id: '4', label: '4', x: 550, y: 150 },
    { id: '5', label: '5', x: 550, y: 450 },
    { id: '6', label: '6', x: 750, y: 300 },
  ],
  edges: [
    { id: 'e201', source: '1', target: '2', weight: 3 },
    { id: 'e202', source: '1', target: '3', weight: 5 },
    { id: 'e203', source: '2', target: '3', weight: 1 },
    { id: 'e204', source: '2', target: '4', weight: 6 },
    { id: 'e205', source: '3', target: '5', weight: 12 },
    { id: 'e206', source: '4', target: '5', weight: 2 },
    { id: 'e207', source: '4', target: '6', weight: 8 },
    { id: 'e208', source: '5', target: '6', weight: 4 },
  ],
};

export const presets: SavedPreset[] = [travelMapPreset, diamondPreset, standardCyclePreset];
