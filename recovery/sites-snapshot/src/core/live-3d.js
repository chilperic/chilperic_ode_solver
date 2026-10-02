/* Foko Lab live 3D scientific view builders.
 * Pure specification helpers: workspaces own playback; the shared plot lifecycle owns rendering.
 */
(function (root) {
  'use strict';

  const CAMERA = Object.freeze({ eye: { x: 1.45, y: 1.45, z: 1.05 }, up: { x: 0, y: 0, z: 1 } });

  function finite(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function clampIndex(index, length) {
    return Math.max(0, Math.min(Math.max(0, length - 1), Math.floor(finite(index, 0))));
  }

  function pointStride(size, frameCount, budget) {
    const total = Math.max(1, size * size * Math.max(1, frameCount));
    return Math.max(1, Math.ceil(Math.sqrt(total / Math.max(250, finite(budget, 5200)))));
  }

  function sceneLayout(title, axes, revision) {
    return {
      title: { text: title },
      uirevision: revision,
      paper_bgcolor: 'rgba(0,0,0,0)',
      margin: { l: 8, r: 8, t: 44, b: 8 },
      legend: { orientation: 'h', x: 0, y: 1.02 },
      scene: {
        uirevision: revision,
        camera: CAMERA,
        aspectmode: 'manual',
        aspectratio: { x: 1, y: 1, z: .78 },
        xaxis: { title: axes.x, gridcolor: '#d9e5ec', zerolinecolor: '#b9ccd8' },
        yaxis: { title: axes.y, gridcolor: '#d9e5ec', zerolinecolor: '#b9ccd8' },
        zaxis: { title: axes.z, gridcolor: '#d9e5ec', zerolinecolor: '#b9ccd8' }
      }
    };
  }

  function centroid(grid, size, stateIndex) {
    let x = 0, y = 0, count = 0;
    for (let index = 0; index < grid.length; index += 1) {
      if (grid[index] !== stateIndex) continue;
      x += index % size;
      y += Math.floor(index / size);
      count += 1;
    }
    return count ? { x: x / count, y: y / count, count: count } : null;
  }

  function agentSpaceTimeSpec(input) {
    const frames = Array.isArray(input && input.frames) ? input.frames : [];
    if (!frames.length) throw new Error('At least one computed Agent frame is required for live 3D.');
    const size = Math.max(1, Math.floor(finite(input.size, 1)));
    const states = Array.isArray(input.states) ? input.states : [];
    const colors = Array.isArray(input.colors) ? input.colors : [];
    const currentIndex = clampIndex(input.index, frames.length);
    const trailFrames = Math.max(2, Math.min(24, Math.floor(finite(input.trailFrames, 12))));
    const startIndex = Math.max(0, currentIndex - trailFrames + 1);
    const visible = frames.slice(startIndex, currentIndex + 1);
    const stride = pointStride(size, visible.length, input.pointBudget);
    const emptyState = Number.isInteger(input.emptyState) ? input.emptyState : null;
    const current = frames[currentIndex];
    const traces = [];

    states.forEach(function (name, stateIndex) {
      if (emptyState === stateIndex) return;
      const trailX = [], trailY = [], trailZ = [], trailText = [];
      visible.slice(0, -1).forEach(function (frame) {
        for (let row = 0; row < size; row += stride) for (let col = 0; col < size; col += stride) {
          if (frame.grid[row * size + col] !== stateIndex) continue;
          trailX.push(col); trailY.push(row); trailZ.push(frame.step);
          trailText.push(name + ' · row ' + row + ' · column ' + col + ' · step ' + frame.step);
        }
      });
      if (trailX.length) traces.push({
        type: 'scatter3d', mode: 'markers', x: trailX, y: trailY, z: trailZ,
        marker: { size: 2, color: colors[stateIndex] || '#64748b', opacity: .15 },
        text: trailText, hovertemplate: '%{text}<extra></extra>', showlegend: false, name: name + ' trail'
      });

      const x = [], y = [], z = [], text = [];
      for (let row = 0; row < size; row += stride) for (let col = 0; col < size; col += stride) {
        if (current.grid[row * size + col] !== stateIndex) continue;
        x.push(col); y.push(row); z.push(current.step);
        text.push(name + ' · row ' + row + ' · column ' + col + ' · step ' + current.step);
      }
      if (x.length) traces.push({
        type: 'scatter3d', mode: 'markers', x: x, y: y, z: z,
        marker: { size: 4.6, color: colors[stateIndex] || '#334155', opacity: .92, line: { color: '#ffffff', width: .35 } },
        text: text, hovertemplate: '%{text}<extra></extra>', name: name + ' · current'
      });

      const centroids = visible.map(function (frame) {
        const point = centroid(frame.grid, size, stateIndex);
        return point && { x: point.x, y: point.y, z: frame.step, count: point.count };
      }).filter(Boolean);
      if (centroids.length > 1) traces.push({
        type: 'scatter3d', mode: 'lines+markers',
        x: centroids.map(function (p) { return p.x; }),
        y: centroids.map(function (p) { return p.y; }),
        z: centroids.map(function (p) { return p.z; }),
        customdata: centroids.map(function (p) { return p.count; }),
        line: { width: 5, color: colors[stateIndex] || '#334155' },
        marker: { size: 3, color: colors[stateIndex] || '#334155' },
        hovertemplate: name + ' centroid<br>column %{x:.2f}<br>row %{y:.2f}<br>step %{z}<br>count %{customdata}<extra></extra>',
        showlegend: false, name: name + ' centroid path'
      });
    });

    const planeZ = current.step;
    traces.unshift({
      type: 'mesh3d', x: [0, size - 1, size - 1, 0], y: [0, 0, size - 1, size - 1],
      z: [planeZ, planeZ, planeZ, planeZ], i: [0, 0], j: [1, 2], k: [2, 3],
      color: '#0f8f9b', opacity: .055, hoverinfo: 'skip', showlegend: false, name: 'current time slice'
    });

    const layout = sceneLayout('Live Agent space–time cube · step ' + current.step, {
      x: 'Lattice column', y: 'Lattice row', z: 'Algorithmic step'
    }, 'foko-agent-space-time-camera');
    layout.scene.xaxis.range = [-.5, size - .5];
    layout.scene.yaxis.range = [size - .5, -.5];
    layout.scene.zaxis.range = [Math.min(0, visible[0].step), Math.max(1, current.totalSteps || current.step)];
    return { traces: traces, layout: layout, metadata: { currentIndex: currentIndex, currentStep: current.step, displayedFrames: visible.length, stride: stride } };
  }

  function trajectorySpec(input) {
    const t = Array.isArray(input && input.t) ? input.t : [];
    const y = Array.isArray(input && input.y) ? input.y : [];
    if (y.length < 3 || !t.length) throw new Error('Live 3D trajectory requires three computed states.');
    const index = clampIndex(input.index, t.length);
    const end = index + 1;
    const names = Array.isArray(input.names) ? input.names : ['x', 'y', 'z'];
    const traces = [{
      type: 'scatter3d', mode: 'lines+markers', x: y[0].slice(0, end), y: y[1].slice(0, end), z: y[2].slice(0, end),
      line: { width: 5, color: t.slice(0, end), colorscale: 'Turbo', cmin: t[0], cmax: t[t.length - 1], colorbar: { title: 'Time', thickness: 12 } },
      marker: { size: 2.5, color: t.slice(0, end), colorscale: 'Turbo', cmin: t[0], cmax: t[t.length - 1] },
      text: t.slice(0, end).map(function (value) { return 't = ' + Number(value).toPrecision(5); }),
      hovertemplate: '%{text}<br>' + names[0] + ' %{x:.5g}<br>' + names[1] + ' %{y:.5g}<br>' + names[2] + ' %{z:.5g}<extra></extra>',
      name: 'computed trajectory'
    }, {
      type: 'scatter3d', mode: 'markers', x: [y[0][0]], y: [y[1][0]], z: [y[2][0]],
      marker: { size: 7, color: '#111827', symbol: 'cross' }, name: 'start'
    }, {
      type: 'scatter3d', mode: 'markers', x: [y[0][index]], y: [y[1][index]], z: [y[2][index]],
      marker: { size: 8, color: '#39d353', symbol: 'diamond', line: { color: '#ffffff', width: 1 } }, name: index === t.length - 1 ? 'end' : 'current'
    }];
    return {
      traces: traces,
      layout: sceneLayout('Live three-state trajectory · t = ' + Number(t[index]).toPrecision(5), { x: names[0], y: names[1], z: names[2] }, 'foko-model-studio-trajectory-camera'),
      metadata: { currentIndex: index, time: t[index] }
    };
  }

  root.FokoLive3D = Object.freeze({
    agentSpaceTimeSpec: agentSpaceTimeSpec,
    clampIndex: clampIndex,
    pointStride: pointStride,
    sceneLayout: sceneLayout,
    trajectorySpec: trajectorySpec
  });
}(typeof window !== 'undefined' ? window : globalThis));
