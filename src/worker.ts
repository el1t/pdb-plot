// Worker thread for app.ts
class Setting {
	xRange: [number, number];
	muRange: [number, number];
	get xSpan() {
		return this.xRange[1] - this.xRange[0];
	}
	get muSpan() {
		return this.muRange[1] - this.muRange[0];
	}
	xRes: number;
	muRes: number;
	iterations: number;
	constructor({xRange = [0, 1], muRange = [2.9, 4], xRes, muRes, iterations}:
		{xRange?: [number, number], muRange?: [number, number], xRes: number, muRes: number, iterations: number}) {
		this.xRange = xRange;
		this.muRange = muRange;
		this.xRes = xRes;
		this.muRes = muRes;
		this.iterations = iterations;
	}
}
// Crude polyfill for es6 Set
interface Set<T> {
	has(key: T): boolean;
	add(key: T): Set<T>;
}
const Set: any = (self as any)['Set'] || class {
		hash: any;
		constructor() { this.hash = {}; }
		has(key: any): boolean { return key in this.hash; }
		add(key: any): this { this.hash[key] = true; return this; }
	};
// Run computation
const run = (method: 'iterate' | 'mu', low: number, high: number, settings: Setting) => {
	settings = new Setting(settings);
	let set: Set<number>;
	switch (method) {
		case 'iterate':
			const grid: number[][] = [];
			let hash: number;
			// Generate subset of grid
			for (let mu = 0; mu < settings.muRes; mu++)
				for (let x = low; x < high; x++)
					grid.push([settings.muRange[0] + mu / settings.muRes * settings.muSpan,
						settings.xRange[0] + x / settings.xRes * settings.xSpan]);
			// Main loop
			for (let iterations: number = 0; iterations < settings.iterations; iterations++) {
				set = new Set();
				// Iterate each point once
				for (let i = 0; i < grid.length; i++) {
					if (grid[i] === undefined) continue;
					grid[i][1] = grid[i][0] * grid[i][1] * (1 - grid[i][1]);
					// Remove coalesced points
					hash = 1000 * grid[i][0] + grid[i][1];
					if (set.has(hash)) {
						delete grid[i];
					} else {
						set.add(hash);
					}
				}
				// Send array to host
				(self as any).postMessage(grid);
			}
			break;
		case 'mu':
			let mu: number = 0;
			let tempMu: number;
			const xVals: number[] = [];
			// Generate subset of x-values
			for (let x = low; x < high; x++)
				xVals.push(settings.xRange[0] + x / settings.xRes * settings.xSpan);
			// Main loop
			for (let mu: number = 0; mu < settings.muRes; mu++) {
				set = new Set();
				tempMu = settings.muRange[0] + mu / settings.muRes * settings.muSpan;
				for (let xVal of xVals) {
					// Iterate a bunch of times
					for (let i = 0; i < settings.iterations - 3; i += 4) {
						xVal = tempMu * xVal * (1 - xVal);
						xVal = tempMu * xVal * (1 - xVal);
						xVal = tempMu * xVal * (1 - xVal);
						xVal = tempMu * xVal * (1 - xVal);
					}
					// Ignore coalesced points
					if (!set.has(xVal)) {
						(self as any).postMessage([tempMu, xVal]);
						set.add(xVal);
					}
				}
			}
			break;
		default:

	}
	(self as any).postMessage(false);
	self.close();
};

// Wait for start command
self.onmessage = e => {
	run.apply(this, e.data);
};
