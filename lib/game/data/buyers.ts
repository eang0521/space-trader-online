import { BuyerCardDef } from '../types';

export const BUYER_CARDS: BuyerCardDef[] = [
  // b1: 2blue=4, 1yellow=3, 1blue=1, 1green=1
  {
    id: 'b1',
    deals: [
      { id: 'b1-A', label: 'A', requirements: [{ color: 'blue', count: 2 }], credits: 4 },
      { id: 'b1-B', label: 'B', requirements: [{ color: 'yellow', count: 1 }], credits: 3 },
      { id: 'b1-C', label: 'C', requirements: [{ color: 'blue', count: 1 }], credits: 1 },
      { id: 'b1-D', label: 'D', requirements: [{ color: 'green', count: 1 }], credits: 1 },
    ],
  },
  // b2: 4red=22, 1white=3, 1blue=2
  {
    id: 'b2',
    deals: [
      { id: 'b2-A', label: 'A', requirements: [{ color: 'red', count: 3 }], credits: 22 },
      { id: 'b2-B', label: 'B', requirements: [{ color: 'white', count: 1 }], credits: 3 },
      { id: 'b2-C', label: 'C', requirements: [{ color: 'blue', count: 1 }], credits: 2 },
    ],
  },
  // b3: 1yellow+1white+1red=18, 1red=4, 1blue=2
  {
    id: 'b3',
    deals: [
      {
        id: 'b3-A',
        label: 'A',
        requirements: [
          { color: 'yellow', count: 1 },
          { color: 'white', count: 1 },
          { color: 'red', count: 1 },
        ],
        credits: 18,
      },
      { id: 'b3-B', label: 'B', requirements: [{ color: 'red', count: 1 }], credits: 4 },
      { id: 'b3-C', label: 'C', requirements: [{ color: 'blue', count: 1 }], credits: 2 },
    ],
  },
  // b4: 2yellow=7, 1black=7, 1white=3, 1green=2
  {
    id: 'b4',
    deals: [
      { id: 'b4-A', label: 'A', requirements: [{ color: 'yellow', count: 2 }], credits: 7 },
      { id: 'b4-B', label: 'B', requirements: [{ color: 'black', count: 1 }], credits: 7 },
      { id: 'b4-C', label: 'C', requirements: [{ color: 'white', count: 1 }], credits: 3 },
      { id: 'b4-D', label: 'D', requirements: [{ color: 'green', count: 1 }], credits: 2 },
    ],
  },
  // b5: 1blue+1green+1yellow=7, 1green=3, 1green=2
  {
    id: 'b5',
    deals: [
      {
        id: 'b5-A',
        label: 'A',
        requirements: [
          { color: 'blue', count: 1 },
          { color: 'green', count: 1 },
          { color: 'yellow', count: 1 },
        ],
        credits: 7,
      },
      { id: 'b5-B', label: 'B', requirements: [{ color: 'green', count: 1 }], credits: 3 },
      { id: 'b5-C', label: 'C', requirements: [{ color: 'green', count: 1 }], credits: 2 },
    ],
  },
  // b6: 2green=5, 1red=5, 1green=3, 1yellow=2
  {
    id: 'b6',
    deals: [
      { id: 'b6-A', label: 'A', requirements: [{ color: 'green', count: 2 }], credits: 5 },
      { id: 'b6-B', label: 'B', requirements: [{ color: 'red', count: 1 }], credits: 5 },
      { id: 'b6-C', label: 'C', requirements: [{ color: 'green', count: 1 }], credits: 3 },
      { id: 'b6-D', label: 'D', requirements: [{ color: 'yellow', count: 1 }], credits: 2 },
    ],
  },
  // b7: 2white=10, 1red=6, 1red=4, 1blue=1
  {
    id: 'b7',
    deals: [
      { id: 'b7-A', label: 'A', requirements: [{ color: 'white', count: 2 }], credits: 10 },
      { id: 'b7-B', label: 'B', requirements: [{ color: 'red', count: 1 }], credits: 6 },
      { id: 'b7-C', label: 'C', requirements: [{ color: 'red', count: 1 }], credits: 4 },
      { id: 'b7-D', label: 'D', requirements: [{ color: 'blue', count: 1 }], credits: 1 },
    ],
  },
  // b8: 2white=11, 1black=6, 1red=5, 1red=5
  {
    id: 'b8',
    deals: [
      { id: 'b8-A', label: 'A', requirements: [{ color: 'white', count: 2 }], credits: 11 },
      { id: 'b8-B', label: 'B', requirements: [{ color: 'black', count: 1 }], credits: 6 },
      { id: 'b8-C', label: 'C', requirements: [{ color: 'red', count: 1 }], credits: 5 },
      { id: 'b8-D', label: 'D', requirements: [{ color: 'red', count: 1 }], credits: 5 },
    ],
  },
  // b9: 3yellow=12, 1white=5, 1red=5
  {
    id: 'b9',
    deals: [
      { id: 'b9-A', label: 'A', requirements: [{ color: 'yellow', count: 3 }], credits: 12 },
      { id: 'b9-B', label: 'B', requirements: [{ color: 'white', count: 1 }], credits: 5 },
      { id: 'b9-C', label: 'C', requirements: [{ color: 'red', count: 1 }], credits: 5 },
    ],
  },
  // b10: 1blue+1yellow+1white=10, 1black=6, 1yellow=4
  {
    id: 'b10',
    deals: [
      {
        id: 'b10-A',
        label: 'A',
        requirements: [
          { color: 'blue', count: 1 },
          { color: 'yellow', count: 1 },
          { color: 'white', count: 1 },
        ],
        credits: 10,
      },
      { id: 'b10-B', label: 'B', requirements: [{ color: 'black', count: 1 }], credits: 6 },
      { id: 'b10-C', label: 'C', requirements: [{ color: 'yellow', count: 1 }], credits: 4 },
    ],
  },
  // b11: 1black=6, 2green=4, 1yellow=4, 1blue=1
  {
    id: 'b11',
    deals: [
      { id: 'b11-A', label: 'A', requirements: [{ color: 'black', count: 1 }], credits: 6 },
      { id: 'b11-B', label: 'B', requirements: [{ color: 'green', count: 2 }], credits: 4 },
      { id: 'b11-C', label: 'C', requirements: [{ color: 'yellow', count: 1 }], credits: 4 },
      { id: 'b11-D', label: 'D', requirements: [{ color: 'blue', count: 1 }], credits: 1 },
    ],
  },
  // b12: 1white=5, 4blue=3, 1yellow=3
  {
    id: 'b12',
    deals: [
      { id: 'b12-A', label: 'A', requirements: [{ color: 'white', count: 1 }], credits: 5 },
      { id: 'b12-B', label: 'B', requirements: [{ color: 'blue', count: 3 }], credits: 3 },
      { id: 'b12-C', label: 'C', requirements: [{ color: 'yellow', count: 1 }], credits: 3 },
    ],
  },
  // b13: 1black=7, 1red=5, 1blue+1yellow=4, 1white=4
  {
    id: 'b13',
    deals: [
      { id: 'b13-A', label: 'A', requirements: [{ color: 'black', count: 1 }], credits: 7 },
      { id: 'b13-B', label: 'B', requirements: [{ color: 'red', count: 1 }], credits: 5 },
      {
        id: 'b13-C',
        label: 'C',
        requirements: [
          { color: 'blue', count: 1 },
          { color: 'yellow', count: 1 },
        ],
        credits: 4,
      },
      { id: 'b13-D', label: 'D', requirements: [{ color: 'white', count: 1 }], credits: 4 },
    ],
  },
  // b14: 1green+1yellow+1red=16, 1green=2, 1yellow=2
  {
    id: 'b14',
    deals: [
      {
        id: 'b14-A',
        label: 'A',
        requirements: [
          { color: 'green', count: 1 },
          { color: 'yellow', count: 1 },
          { color: 'red', count: 1 },
        ],
        credits: 16,
      },
      { id: 'b14-B', label: 'B', requirements: [{ color: 'green', count: 1 }], credits: 2 },
      { id: 'b14-C', label: 'C', requirements: [{ color: 'yellow', count: 1 }], credits: 2 },
    ],
  },
  // b15: 2green=5, 1blue=2, 1yellow=2, 1blue=1
  {
    id: 'b15',
    deals: [
      { id: 'b15-A', label: 'A', requirements: [{ color: 'green', count: 2 }], credits: 5 },
      { id: 'b15-B', label: 'B', requirements: [{ color: 'blue', count: 1 }], credits: 2 },
      { id: 'b15-C', label: 'C', requirements: [{ color: 'yellow', count: 1 }], credits: 2 },
      { id: 'b15-D', label: 'D', requirements: [{ color: 'blue', count: 1 }], credits: 1 },
    ],
  },
  // b16: 2white=10, 1green=2, 1blue=1, 1blue=1
  {
    id: 'b16',
    deals: [
      { id: 'b16-A', label: 'A', requirements: [{ color: 'white', count: 2 }], credits: 10 },
      { id: 'b16-B', label: 'B', requirements: [{ color: 'green', count: 1 }], credits: 2 },
      { id: 'b16-C', label: 'C', requirements: [{ color: 'blue', count: 1 }], credits: 1 },
      { id: 'b16-D', label: 'D', requirements: [{ color: 'blue', count: 1 }], credits: 1 },
    ],
  },
  // b17: 1white=4, 4blue=3, 1blue=2
  {
    id: 'b17',
    deals: [
      { id: 'b17-A', label: 'A', requirements: [{ color: 'white', count: 1 }], credits: 4 },
      { id: 'b17-B', label: 'B', requirements: [{ color: 'blue', count: 3 }], credits: 3 },
      { id: 'b17-C', label: 'C', requirements: [{ color: 'blue', count: 1 }], credits: 2 },
    ],
  },
  // b18: 2green=6, 1red=5, 1white=4, 1yellow=2
  {
    id: 'b18',
    deals: [
      { id: 'b18-A', label: 'A', requirements: [{ color: 'green', count: 2 }], credits: 6 },
      { id: 'b18-B', label: 'B', requirements: [{ color: 'red', count: 1 }], credits: 5 },
      { id: 'b18-C', label: 'C', requirements: [{ color: 'white', count: 1 }], credits: 4 },
      { id: 'b18-D', label: 'D', requirements: [{ color: 'yellow', count: 1 }], credits: 2 },
    ],
  },
  // b19: 1white=4, 1green=3, 1green=2, 2blue=1
  {
    id: 'b19',
    deals: [
      { id: 'b19-A', label: 'A', requirements: [{ color: 'white', count: 1 }], credits: 4 },
      { id: 'b19-B', label: 'B', requirements: [{ color: 'green', count: 1 }], credits: 3 },
      { id: 'b19-C', label: 'C', requirements: [{ color: 'green', count: 1 }], credits: 2 },
      { id: 'b19-D', label: 'D', requirements: [{ color: 'blue', count: 2 }], credits: 1 },
    ],
  },
  // b20: 1green+1yellow+1white=12, 1blue=2, 1blue=1
  {
    id: 'b20',
    deals: [
      {
        id: 'b20-A',
        label: 'A',
        requirements: [
          { color: 'green', count: 1 },
          { color: 'yellow', count: 1 },
          { color: 'white', count: 1 },
        ],
        credits: 12,
      },
      { id: 'b20-B', label: 'B', requirements: [{ color: 'blue', count: 1 }], credits: 2 },
      { id: 'b20-C', label: 'C', requirements: [{ color: 'blue', count: 1 }], credits: 1 },
    ],
  },
  // b21: 1blue+1green+1red=12, 1blue=1, 1blue=1
  {
    id: 'b21',
    deals: [
      {
        id: 'b21-A',
        label: 'A',
        requirements: [
          { color: 'blue', count: 1 },
          { color: 'green', count: 1 },
          { color: 'red', count: 1 },
        ],
        credits: 12,
      },
      { id: 'b21-B', label: 'B', requirements: [{ color: 'blue', count: 1 }], credits: 1 },
      { id: 'b21-C', label: 'C', requirements: [{ color: 'blue', count: 1 }], credits: 1 },
    ],
  },
  // b22: 1black=6, 1blue+1white=5, 1yellow=4, 1yellow=3
  {
    id: 'b22',
    deals: [
      { id: 'b22-A', label: 'A', requirements: [{ color: 'black', count: 1 }], credits: 6 },
      {
        id: 'b22-B',
        label: 'B',
        requirements: [
          { color: 'blue', count: 1 },
          { color: 'white', count: 1 },
        ],
        credits: 5,
      },
      { id: 'b22-C', label: 'C', requirements: [{ color: 'yellow', count: 1 }], credits: 4 },
      { id: 'b22-D', label: 'D', requirements: [{ color: 'yellow', count: 1 }], credits: 3 },
    ],
  },
  // b23: 1blue+2yellow=12, 1black=6, 1white=3
  {
    id: 'b23',
    deals: [
      {
        id: 'b23-A',
        label: 'A',
        requirements: [
          { color: 'blue', count: 1 },
          { color: 'yellow', count: 2 },
        ],
        credits: 12,
      },
      { id: 'b23-B', label: 'B', requirements: [{ color: 'black', count: 1 }], credits: 6 },
      { id: 'b23-C', label: 'C', requirements: [{ color: 'white', count: 1 }], credits: 3 },
    ],
  },
  // b24: 2yellow=7, 1red=4, 1blue=2, 1green=2
  {
    id: 'b24',
    deals: [
      { id: 'b24-A', label: 'A', requirements: [{ color: 'yellow', count: 2 }], credits: 7 },
      { id: 'b24-B', label: 'B', requirements: [{ color: 'red', count: 1 }], credits: 4 },
      { id: 'b24-C', label: 'C', requirements: [{ color: 'blue', count: 1 }], credits: 2 },
      { id: 'b24-D', label: 'D', requirements: [{ color: 'green', count: 1 }], credits: 2 },
    ],
  },
  // b25: 4blue=3, 1green=3, 1blue=1
  {
    id: 'b25',
    deals: [
      { id: 'b25-A', label: 'A', requirements: [{ color: 'blue', count: 3 }], credits: 3 },
      { id: 'b25-B', label: 'B', requirements: [{ color: 'green', count: 1 }], credits: 3 },
      { id: 'b25-C', label: 'C', requirements: [{ color: 'blue', count: 1 }], credits: 1 },
    ],
  },
  // b26: 1white=5, 1red=5, 2green=4, 1yellow=3
  {
    id: 'b26',
    deals: [
      { id: 'b26-A', label: 'A', requirements: [{ color: 'white', count: 1 }], credits: 5 },
      { id: 'b26-B', label: 'B', requirements: [{ color: 'red', count: 1 }], credits: 5 },
      { id: 'b26-C', label: 'C', requirements: [{ color: 'green', count: 2 }], credits: 4 },
      { id: 'b26-D', label: 'D', requirements: [{ color: 'yellow', count: 1 }], credits: 3 },
    ],
  },
  // b27: 1black=6, 2green=4, 1white=4, 1blue=2
  {
    id: 'b27',
    deals: [
      { id: 'b27-A', label: 'A', requirements: [{ color: 'black', count: 1 }], credits: 6 },
      { id: 'b27-B', label: 'B', requirements: [{ color: 'green', count: 2 }], credits: 4 },
      { id: 'b27-C', label: 'C', requirements: [{ color: 'white', count: 1 }], credits: 4 },
      { id: 'b27-D', label: 'D', requirements: [{ color: 'blue', count: 1 }], credits: 2 },
    ],
  },
  // b28: 4green=10, 1white=3, 1blue=1
  {
    id: 'b28',
    deals: [
      { id: 'b28-A', label: 'A', requirements: [{ color: 'green', count: 3 }], credits: 10 },
      { id: 'b28-B', label: 'B', requirements: [{ color: 'white', count: 1 }], credits: 3 },
      { id: 'b28-C', label: 'C', requirements: [{ color: 'blue', count: 1 }], credits: 1 },
    ],
  },
  // b29: 1green=3, 2blue=2, 1blue=1, 1green=1
  {
    id: 'b29',
    deals: [
      { id: 'b29-A', label: 'A', requirements: [{ color: 'green', count: 1 }], credits: 3 },
      { id: 'b29-B', label: 'B', requirements: [{ color: 'blue', count: 2 }], credits: 2 },
      { id: 'b29-C', label: 'C', requirements: [{ color: 'blue', count: 1 }], credits: 1 },
      { id: 'b29-D', label: 'D', requirements: [{ color: 'green', count: 1 }], credits: 1 },
    ],
  },
  // b30: 1green+1yellow+1white=15, 1black=5, 1blue=1
  {
    id: 'b30',
    deals: [
      {
        id: 'b30-A',
        label: 'A',
        requirements: [
          { color: 'green', count: 1 },
          { color: 'yellow', count: 1 },
          { color: 'white', count: 1 },
        ],
        credits: 15,
      },
      { id: 'b30-B', label: 'B', requirements: [{ color: 'black', count: 1 }], credits: 5 },
      { id: 'b30-C', label: 'C', requirements: [{ color: 'blue', count: 1 }], credits: 1 },
    ],
  },
];
