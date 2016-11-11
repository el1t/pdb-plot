// import { Observable } from 'rxjs/observable';
const Chart = require('chart.js');
interface Setting {
	xRes: number;
	muRes: number;
	iterations: number;
}
const PRESETS: { sparse: Setting, normal: Setting, dense: Setting } = {
	sparse: {
		xRes: 64,
		muRes: 160,
		iterations: 2048
	},
	normal: {
		xRes: 128,
		muRes: 192,
		iterations: 2048
	},
	dense: {
		xRes: 192,
		muRes: 384,
		iterations: 2048
	}
};
let settings: Setting = {
	xRes: 32,
	muRes: 512,
	iterations: 300
};
// settings = PRESETS.sparse;

class Coordinate {
	public x: number;
	public y: number;
	get hashable(): number {
		return this.x * 1000 + this.y;
	}
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
	dist(c: Coordinate): number {
		return Math.sqrt((this.x - c.x)^2 + (this.y - c.y)^2);
	}
	eq(c: Coordinate): boolean {
		// Ignore this.x because mu should always be equal
		return Math.abs(this.hashable - c.hashable) <= 0.0001;
	}
	compareTo(c: Coordinate): number {
		return this.hashable - c.hashable;
	}
}

class Outlet {
	chart: any;
	requestId: number;
	graph: Graph;
	dirty: boolean;
	constructor(graph: Graph) {
		this.graph = graph;
		this.chart = new Chart(document.getElementById('plot'), {
			type: 'line',
			data: {
				datasets: [{
					label: 'Scatter Dataset',
					data: graph.grid
				}]
			},
			options: {
				scales: {
					xAxes: [{
						type: 'linear',
						position: 'bottom',
						ticks: {
							min: 2.9,
							steps: 11,
							max: 4
						}
					}],
					yAxes: [{
						display: true,
						ticks: {
							min: 0,
							max: 1
						}
					}]
				},
				elements: {
					point: {
						radius: 0.5
					},
				},
				showLines: false,
				animation: false
			}
		});
	}
	start() {
		// Update chart every frame
		const step = (): void => {
			if (this.dirty || this.graph.workers) {
				this.chart.update();
				this.dirty = false;
			}
			this.requestId = requestAnimationFrame(step);
		};
		step();
	}
	stop() {
		cancelAnimationFrame(this.requestId);
		this.requestId = null;
		if (this.dirty || this.graph.workers) {
			this.chart.update();
			this.dirty = false;
		}
		console.log('Halted');
	}
}

class Graph {
	grid: Coordinate[] = [];
	method: 'iterate' | 'mu' = 'mu';
	hash: Set<number>;
	timer: number; // id of timeout for single-threaded computation
	outlet: Outlet;
	workers: Worker[];
	finishedWorkers: number; // Count number of completed workers

	constructor() {
		// Check for webworker support
		const hasWebworker = typeof Worker === 'function';
		if (hasWebworker) {
			// Use half of available threads to save CPU for DOM refreshing
			const threads = Math.ceil(navigator['hardwareConcurrency'] / 2) || 2;
			console.log(`Web workers enabled, spawning ${threads} threads.`);
			this.finishedWorkers = 0;
			this.workers = [];
			for (let thread = 0; thread < threads; thread++)
				this.workers.push(new Worker('worker.js'))
		}
		this.initialize();
		this.outlet = new Outlet(this);
	}

	private initialize(): void {
		this.grid = [];
		this.hash = new Set();
		switch (this.method) {
			case 'iterate':
				// Initialize uniform grid
				for (let mu = 0; mu < settings.muRes; mu++)
					for (let x = 1; x < settings.xRes; x++)
						this.grid.push(new Coordinate(2.9 + mu / settings.muRes * 1.1, x / settings.xRes));
				break;
		}
	}
	private startWorkers(): boolean {
		if (!this.workers) return false;
		const split: number = settings.xRes / this.workers.length;
		let low: number = 1;
		for (const worker of this.workers) {
			switch (this.method) {
				case 'iterate':
					const current = Math.ceil(low - 1) * settings.muRes;
					worker.onmessage = (e: MessageEvent): void => {
						if (!e.data) {
							this.deleteWorker(worker);
							return;
						}
						// split = e.data.length
						for (let i = 0; i < e.data.length; i++) {
							// TODO: fix edge case when splitting work
							if (current + i >= this.grid.length) break;
							if (!e.data[i]) continue; // coalesced point
							this.grid[current + i].x = e.data[i][0];
							this.grid[current + i].y = e.data[i][1];
						}
					};
					break;
				case 'mu':
					worker.onmessage = (e: MessageEvent): void => {
						if (!e.data) {
							this.deleteWorker(worker);
							return;
						}
						this.grid.push(new Coordinate(e.data[0], e.data[1]));
					};
			}
			worker.postMessage([this.method, Math.ceil(low), Math.ceil(low + split), settings]);
			low += split;
		}
		return true;
	}
	private startSingleThread(): boolean {
		// Clear previous task if running
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
		switch (this.method) {
			case 'iterate':
				let iterations: number = 0;
				// Main loop
				this.timer = window.setInterval(() => {
					iterations++;
					let point: Coordinate;
					this.hash = new Set();
					// Iterate each point once
					for (let i = 0; i < this.grid.length; i++) {
						if (this.grid[i] === undefined) continue;
						point = this.grid[i];
						point.y = point.x * point.y * (1 - point.y);
						// Remove coalesced points
						if (this.hash.has(point.hashable)) {
							delete this.grid[i];
						} else {
							this.grid[i] = point;
							this.hash.add(point.hashable);
						}
					}
					this.outlet.dirty = true;
					// this.grid.sort((a, b) => a.compareTo(b));
					if (iterations > settings.iterations) {
						this.stop();
					}
				}, 10);
				break;
			case 'mu':
				let mu: number = 0;
				let tempMu: number;
				const xVals: number[] = [];
				for (let x = 1; x < settings.xRes; x++)
					xVals.push(x / settings.xRes);
				// Main loop
				this.timer = window.setInterval(() => {
					this.hash = new Set();
					tempMu = 2.9 + mu++ / settings.muRes * 1.1;
					for (let xVal of xVals) {
						// Iterate a bunch of times
						for (let i = 0; i < settings.iterations - 3; i += 4) {
							xVal = tempMu * xVal * (1 - xVal);
							xVal = tempMu * xVal * (1 - xVal);
							xVal = tempMu * xVal * (1 - xVal);
							xVal = tempMu * xVal * (1 - xVal);
						}
						// Ignore coalesced points
						if (!this.hash.has(xVal)) {
							this.grid.push(new Coordinate(tempMu, xVal));
							this.hash.add(xVal);
						}
					}
					this.outlet.dirty = true;
					if (mu > settings.muRes) {
						this.stop();
					}
				}, 10);
				break;
		}
		return true;
	}
	private deleteWorker(worker: Worker): void {
		console.log(`Deleting worker #${this.workers.indexOf(worker) + 1}`);
		delete this.workers[this.workers.indexOf(worker)];
		// If all workers are finished, stop rendering
		if (++this.finishedWorkers == this.workers.length)
			this.outlet.stop();
	}

	start(): Graph {
		if (!this.startWorkers()) {
			this.startSingleThread();
		}
		// Start updating outlet
		this.outlet.start();
		return this;
	}
	stop(): Graph {
		if (this.workers) {
			// Terminate all webworkers
			for (const worker of this.workers) {
				if (worker)
					worker.terminate();
			}
			this.workers.length = 0;
		} else if (this.timer) {
			// Halt single-threaded loop
			clearInterval(this.timer);
			this.timer = null;
		}
		this.outlet.stop();
		return this;
	}
}

const graph = new Graph();
graph.start();
