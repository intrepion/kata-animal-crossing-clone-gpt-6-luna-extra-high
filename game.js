(() => {
  const canvas = document.getElementById("island");
  const ctx = canvas.getContext("2d");
  const canvasWrap = document.getElementById("canvas-wrap");
  const prompt = document.getElementById("action-prompt");
  const promptText = document.getElementById("prompt-text");
  const promptIcon = document.getElementById("prompt-icon");
  const toastEl = document.getElementById("toast");
  const helpCard = document.getElementById("controls-card");
  const helpButton = document.getElementById("help-button");
  const inventoryEl = document.getElementById("inventory-grid");
  const taskListEl = document.getElementById("task-list");
  const bellEl = document.getElementById("bell-count");
  const pocketCountEl = document.getElementById("pocket-count");
  const sellTotalEl = document.getElementById("sell-total");
  const sellButton = document.getElementById("sell-button");
  const fishButton = document.getElementById("fish-button");
  const pickButton = document.getElementById("pick-button");

  const STORAGE_KEY = "mosswharf-island-v1";
  const ITEMS = {
    apple: { emoji: "🍎", name: "Island apple", price: 100 },
    shell: { emoji: "🐚", name: "Sea shell", price: 70 },
    wood: { emoji: "🪵", name: "Driftwood", price: 60 },
    weed: { emoji: "🌿", name: "Fresh weeds", price: 30 },
    flower: { emoji: "🌼", name: "Wildflower", price: 50 },
    stone: { emoji: "🪨", name: "Smooth stone", price: 80 },
    fish: { emoji: "🐟", name: "Silver fish", price: 200 },
  };
  const ITEM_ORDER = Object.keys(ITEMS);
  const TASKS = [
    { id: "apples", icon: "🍎", title: "Pick ripe apples", detail: "From the orchard trees", target: 3 },
    { id: "fish", icon: "🎣", title: "Catch a silver fish", detail: "Try the east shore", target: 1 },
    { id: "sell", icon: "🧺", title: "Trade finds for bells", detail: "Earn 300 bells at market", target: 300 },
  ];
  const TERRAIN = { water: "#83cfdb", waterAlt: "#8dd6de", grass: "#a4cd85", grassAlt: "#abd18c", sand: "#eedba0", path: "#dfca8d" };

  function loadSavedGame() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && saved.inventory && Number.isFinite(saved.bells)) {
        return {
          bells: saved.bells,
          inventory: Object.fromEntries(ITEM_ORDER.map((item) => [item, Math.max(0, Number(saved.inventory[item]) || 0)])),
          soldBells: Math.max(0, Number(saved.soldBells) || 0),
          fishCaught: Math.max(0, Number(saved.fishCaught) || 0),
          pickedApples: Math.max(0, Number(saved.pickedApples) || 0),
          collected: Array.isArray(saved.collected) ? saved.collected : [],
          tappedRocks: Array.isArray(saved.tappedRocks) ? saved.tappedRocks : [],
          player: saved.player && Number.isFinite(saved.player.x) && Number.isFinite(saved.player.y) ? saved.player : { x: 9.4, y: 10.1 },
          completionBonus: Boolean(saved.completionBonus),
        };
      }
    } catch (_) {
      // A damaged local save should start a fresh island rather than strand the player.
    }
    return {
      bells: 2480,
      inventory: Object.fromEntries(ITEM_ORDER.map((item) => [item, 0])),
      soldBells: 0,
      fishCaught: 0,
      pickedApples: 0,
      collected: [],
      tappedRocks: [],
      player: { x: 9.4, y: 10.1 },
      completionBonus: false,
    };
  }

  const state = loadSavedGame();
  state.target = null;
  state.targetObjectId = null;
  state.fishing = null;
  state.facing = "down";
  state.keys = new Set();
  state.lastSave = 0;
  state.lastTimestamp = 0;
  state.toastTimer = 0;
  state.treeCooldown = {};
  state.pendingCompletionNotice = false;
  state.lastTaskCompletion = TASKS.every((task) => taskValue(task.id) >= task.target);

  const objects = [
    ...[
      [4, 6], [6, 3], [13, 4], [16, 7], [3, 11], [7, 14], [12, 14], [16, 11], [5, 9], [14, 10], [9, 13], [11, 6],
    ].map(([x, y], i) => ({ id: `tree-${i}`, type: "tree", x, y })),
    ...[
      [7, 8], [12, 8],
    ].map(([x, y], i) => ({ id: `rock-${i}`, type: "rock", x, y })),
    { id: "shell-0", type: "shell", item: "shell", x: 8.8, y: 11.3 },
    { id: "shell-1", type: "shell", item: "shell", x: 4.7, y: 4.8 },
    { id: "shell-2", type: "shell", item: "shell", x: 15.3, y: 12.4 },
    { id: "shell-3", type: "shell", item: "shell", x: 6.2, y: 13.1 },
    { id: "wood-0", type: "wood", item: "wood", x: 8.2, y: 12.6 },
    { id: "wood-1", type: "wood", item: "wood", x: 13.8, y: 5.8 },
    { id: "weed-0", type: "weed", item: "weed", x: 10.8, y: 9.3 },
    { id: "weed-1", type: "weed", item: "weed", x: 13.2, y: 11.9 },
    { id: "weed-2", type: "weed", item: "weed", x: 6.5, y: 5.6 },
    { id: "flower-0", type: "flower", item: "flower", x: 10.1, y: 7.3 },
    { id: "flower-1", type: "flower", item: "flower", x: 5.6, y: 10.4 },
    { id: "flower-2", type: "flower", item: "flower", x: 14.2, y: 13.2 },
  ];
  const props = [
    { id: "home", type: "home", x: 6.3, y: 7.6 },
    { id: "hall", type: "hall", x: 10.4, y: 5.0 },
    { id: "pier", type: "pier", x: 17.0, y: 11.5 },
  ];
  const pathTiles = new Set();
  for (let x = 8; x <= 12; x += 1) pathTiles.add(`${x},8`);
  for (let y = 6; y <= 13; y += 1) pathTiles.add(`10,${y}`);
  for (let x = 6; x <= 10; x += 1) pathTiles.add(`${x},9`);
  pathTiles.add("7,8"); pathTiles.add("7,9"); pathTiles.add("8,9");
  const pressedButtons = new Map();
  const dimensions = { width: 0, height: 0, ratio: 1, tileW: 45, tileH: 24, top: 24 };

  function pocketTotal() {
    return ITEM_ORDER.reduce((sum, item) => sum + state.inventory[item], 0);
  }
  function taskValue(id) {
    if (id === "apples") return state.pickedApples;
    if (id === "fish") return state.fishCaught;
    return state.soldBells;
  }
  function taskComplete(task) { return taskValue(task.id) >= task.target; }
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        bells: state.bells,
        inventory: state.inventory,
        soldBells: state.soldBells,
        fishCaught: state.fishCaught,
        pickedApples: state.pickedApples,
        collected: state.collected,
        tappedRocks: state.tappedRocks,
        player: { x: state.player.x, y: state.player.y },
        completionBonus: state.completionBonus,
      }));
    } catch (_) {
      // The island remains playable if browser storage is unavailable.
    }
  }
  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    state.toastTimer = 2.15;
  }
  function notify(message) {
    if (state.pendingCompletionNotice) {
      state.pendingCompletionNotice = false;
      return;
    }
    showToast(message);
  }
  function updateTaskCompletion() {
    const completedNow = TASKS.every(taskComplete);
    if (completedNow && !state.completionBonus) {
      state.completionBonus = true;
      state.pendingCompletionNotice = true;
      state.bells += 250;
      showToast("All today's plans are done — a little island bonus! +250 bells");
      save();
    }
    state.lastTaskCompletion = completedNow;
  }
  function updateUI() {
    bellEl.textContent = state.bells.toLocaleString();
    const total = pocketTotal();
    pocketCountEl.textContent = `${total} / 20`;
    inventoryEl.replaceChildren();
    for (let slot = 0; slot < 20; slot += 1) {
      const itemName = ITEM_ORDER.find((name) => state.inventory[name] > 0 && ITEM_ORDER.indexOf(name) === slot);
      const cell = document.createElement("div");
      cell.className = "inventory-slot";
      if (itemName) {
        const item = ITEMS[itemName];
        cell.title = `${item.name} × ${state.inventory[itemName]}`;
        cell.setAttribute("aria-label", cell.title);
        cell.innerHTML = `<span class="item-emoji">${item.emoji}</span><span class="item-count">${state.inventory[itemName]}</span>`;
      } else {
        cell.classList.add("empty");
        cell.setAttribute("aria-hidden", "true");
      }
      inventoryEl.append(cell);
    }
    taskListEl.replaceChildren();
    for (const task of TASKS) {
      const current = taskValue(task.id);
      const done = taskComplete(task);
      const card = document.createElement("div");
      card.className = `task-item${done ? " done" : ""}`;
      const progress = task.id === "sell" ? `${Math.min(current, task.target)} / ${task.target}` : `${Math.min(current, task.target)} / ${task.target}`;
      card.innerHTML = `<span class="task-icon">${done ? "✓" : task.icon}</span><span class="task-copy"><b>${task.title}</b><small>${task.detail}</small></span><span class="task-progress">${progress}</span>`;
      taskListEl.append(card);
    }
    const saleValue = ITEM_ORDER.reduce((sum, name) => sum + state.inventory[name] * ITEMS[name].price, 0);
    sellTotalEl.textContent = `${saleValue.toLocaleString()} ✦`;
    sellButton.disabled = saleValue <= 0;
    pickButton.disabled = false;
    fishButton.disabled = Boolean(state.fishing);
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    dimensions.width = rect.width;
    dimensions.height = rect.height;
    dimensions.ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dimensions.ratio);
    canvas.height = Math.round(rect.height * dimensions.ratio);
    ctx.setTransform(dimensions.ratio, 0, 0, dimensions.ratio, 0, 0);
    dimensions.tileW = Math.min(50, Math.max(37, rect.width / 19.5));
    dimensions.tileH = dimensions.tileW * 0.54;
    dimensions.top = Math.max(15, (rect.height - dimensions.tileH * 19.5) / 2 + 3);
  }
  function project(gx, gy, lift = 0) {
    const { width, tileW, tileH, top } = dimensions;
    return { x: width / 2 + (gx - gy) * tileW * 0.5, y: top + (gx + gy) * tileH * 0.5 - lift };
  }
  function tileCenterDistance(gx, gy) {
    const nx = (gx - 9.5) / 8.8;
    const ny = (gy - 8.5) / 7.65;
    return Math.sqrt(nx * nx + ny * ny);
  }
  function lakeDistance(gx, gy) {
    const nx = (gx - 14.0) / 1.23;
    const ny = (gy - 8.0) / 1.55;
    return Math.sqrt(nx * nx + ny * ny);
  }
  function isWaterTile(gx, gy) {
    return gx < 0 || gy < 0 || gx > 19 || gy > 17 || tileCenterDistance(gx, gy) > 1 || lakeDistance(gx, gy) < 1.04;
  }
  function isWalkable(gx, gy) {
    return tileCenterDistance(gx, gy) < 0.91 && lakeDistance(gx, gy) > 1.53;
  }
  function nearWater() {
    const cx = Math.round(state.player.x);
    const cy = Math.round(state.player.y);
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        if (isWaterTile(cx + dx, cy + dy)) return true;
      }
    }
    return false;
  }
  function nearestObject() {
    let closest = null;
    let best = 1.46;
    for (const object of objects) {
      if (state.collected.includes(object.id)) continue;
      if (object.type === "rock" && state.tappedRocks.includes(object.id)) continue;
      if (object.type === "tree" && (state.treeCooldown[object.id] || 0) >= performance.now()) continue;
      const distance = Math.hypot(state.player.x - object.x, state.player.y - object.y);
      if (distance < best) { closest = object; best = distance; }
    }
    return closest ? { object: closest, distance: best } : null;
  }
  function objectLabel(object) {
    if (object.type === "tree") return ["Shake for an apple", "🍎"];
    if (object.type === "rock") return ["Tap the rock", "🪨"];
    if (object.item) return [`Pick up ${ITEMS[object.item].name.toLowerCase()}`, ITEMS[object.item].emoji];
    return ["Take a closer look", "✦"];
  }
  function refreshPrompt() {
    const near = nearestObject();
    if (near) {
      const [label, icon] = objectLabel(near.object);
      promptText.textContent = label;
      promptIcon.textContent = icon;
      prompt.hidden = false;
      pickButton.classList.add("available");
      return;
    }
    pickButton.classList.remove("available");
    if (state.fishing) {
      promptIcon.textContent = "🫧";
      promptText.textContent = "Waiting for a little nibble…";
      prompt.hidden = false;
    } else if (nearWater()) {
      promptIcon.textContent = "🎣";
      promptText.textContent = "The water looks just right for fishing";
      prompt.hidden = false;
    } else {
      prompt.hidden = true;
    }
  }
  function addItem(name, amount = 1) {
    if (pocketTotal() >= 20) {
      showToast("Your pockets are full — sell a few finds first.");
      return false;
    }
    state.inventory[name] += amount;
    if (name === "apple") state.pickedApples += amount;
    if (name === "fish") state.fishCaught += amount;
    updateUI();
    updateTaskCompletion();
    save();
    return true;
  }
  function interactObject(object) {
    if (!object) return;
    if (object.type === "tree") {
      if (pocketTotal() >= 20) { showToast("Your pockets are full — sell a few finds first."); return; }
      state.treeCooldown[object.id] = performance.now() + 520;
      if (addItem("apple")) notify("A ripe island apple falls into your pocket. 🍎");
      return;
    }
    if (object.type === "rock") {
      if (pocketTotal() >= 20) { showToast("Your pockets are full — sell a few finds first."); return; }
      state.tappedRocks.push(object.id);
      if (addItem("stone")) notify("A smooth little stone. 🪨");
      save();
      return;
    }
    if (object.item) {
      if (addItem(object.item)) {
        state.collected.push(object.id);
        save();
        notify(`${ITEMS[object.item].name} tucked away. ${ITEMS[object.item].emoji}`);
      }
    }
  }
  function interact() {
    const near = nearestObject();
    if (near) { interactObject(near.object); return; }
    if (nearWater()) startFishing();
  }
  function closestWaterTile() {
    let best = null;
    let distance = Infinity;
    const px = Math.round(state.player.x);
    const py = Math.round(state.player.y);
    for (let x = px - 2; x <= px + 2; x += 1) {
      for (let y = py - 2; y <= py + 2; y += 1) {
        if (!isWaterTile(x, y)) continue;
        const d = Math.hypot(px - x, py - y);
        if (d < distance) { best = { x, y }; distance = d; }
      }
    }
    return best;
  }
  function startFishing() {
    if (state.fishing) return;
    if (!nearWater()) { showToast("Find a quiet spot along the shore first."); return; }
    const target = closestWaterTile();
    state.fishing = { time: 2.8, target };
    state.target = null;
    showToast("You cast your line. Let's see who swims by…");
    updateUI();
  }
  function finishFishing() {
    state.fishing = null;
    updateUI();
    if (addItem("fish")) notify("A silver fish! What a lovely catch. 🐟");
  }
  function sellFinds() {
    const worth = ITEM_ORDER.reduce((sum, name) => sum + state.inventory[name] * ITEMS[name].price, 0);
    if (!worth) { showToast("Your pockets are empty. See what the island has for you!"); return; }
    for (const name of ITEM_ORDER) state.inventory[name] = 0;
    state.bells += worth;
    state.soldBells += worth;
    updateUI();
    updateTaskCompletion();
    save();
    notify(`A good little haul. +${worth.toLocaleString()} bells ✦`);
  }
  function setMoveKey(key, enabled) {
    const direction = ({ ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right" })[key];
    if (!direction) return;
    if (enabled) state.keys.add(direction);
    else state.keys.delete(direction);
    if (enabled) state.target = null;
  }
  function movePlayer(dt) {
    let dx = 0;
    let dy = 0;
    if (state.keys.has("left")) dx -= 1;
    if (state.keys.has("right")) dx += 1;
    if (state.keys.has("up")) dy -= 1;
    if (state.keys.has("down")) dy += 1;
    if (!dx && !dy && state.target) {
      const tx = state.target.x - state.player.x;
      const ty = state.target.y - state.player.y;
      const distance = Math.hypot(tx, ty);
      if (distance < 0.1) {
        state.target = null;
        if (state.targetObjectId) {
          const object = objects.find((item) => item.id === state.targetObjectId);
          state.targetObjectId = null;
          if (object) interactObject(object);
        }
      } else { dx = tx / distance; dy = ty / distance; }
    }
    if (!dx && !dy) return;
    const length = Math.hypot(dx, dy);
    dx /= length; dy /= length;
    state.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down");
    const step = 2.6 * dt;
    const nx = state.player.x + dx * step;
    if (isWalkable(nx, state.player.y)) state.player.x = nx;
    const ny = state.player.y + dy * step;
    if (isWalkable(state.player.x, ny)) state.player.y = ny;
    if (state.target && state.targetObjectId && Math.hypot(state.player.x - state.target.x, state.player.y - state.target.y) < 0.95) {
      const object = objects.find((item) => item.id === state.targetObjectId);
      state.target = null;
      state.targetObjectId = null;
      if (object) interactObject(object);
    }
  }
  function tilePath(x, y) {
    return pathTiles.has(`${Math.round(x)},${Math.round(y)}`);
  }
  function diamond(x, y, w, h) {
    ctx.beginPath();
    ctx.moveTo(x, y - h / 2);
    ctx.lineTo(x + w / 2, y);
    ctx.lineTo(x, y + h / 2);
    ctx.lineTo(x - w / 2, y);
    ctx.closePath();
  }
  function drawTerrain(now) {
    const { width, height, tileW, tileH } = dimensions;
    const ocean = ctx.createLinearGradient(0, 0, 0, height);
    ocean.addColorStop(0, "#91d7dc");
    ocean.addColorStop(.55, "#78c7d1");
    ocean.addColorStop(1, "#6dbdca");
    ctx.fillStyle = ocean;
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 26; i += 1) {
      const x = ((i * 97 + Math.sin(now / 1800 + i) * 13) % (width + 30)) - 15;
      const y = (i * 61 + 27) % height;
      ctx.strokeStyle = `rgba(236,255,235,${.1 + ((i % 4) * .025)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x, y, 9 + (i % 5) * 2, 2.4, -.12, .15, Math.PI - .2);
      ctx.stroke();
    }
    for (let sum = 0; sum <= 37; sum += 1) {
      const minX = Math.max(0, sum - 17);
      const maxX = Math.min(19, sum);
      for (let gx = minX; gx <= maxX; gx += 1) {
        const gy = sum - gx;
        if (gy < 0 || gy > 17) continue;
        const p = project(gx, gy);
        const island = tileCenterDistance(gx, gy);
        const lake = lakeDistance(gx, gy);
        let terrain;
        if (isWaterTile(gx, gy)) terrain = (gx + gy) % 3 === 0 ? TERRAIN.waterAlt : TERRAIN.water;
        else if (island > .83 || (lake >= 1.04 && lake < 1.62)) terrain = TERRAIN.sand;
        else if (tilePath(gx, gy)) terrain = TERRAIN.path;
        else terrain = (gx * 7 + gy * 11) % 5 === 0 ? TERRAIN.grassAlt : TERRAIN.grass;
        diamond(p.x, p.y, tileW + .8, tileH + .7);
        ctx.fillStyle = terrain;
        ctx.fill();
        ctx.strokeStyle = isWaterTile(gx, gy) ? "rgba(61,168,185,.16)" : "rgba(111,156,96,.16)";
        ctx.lineWidth = .65;
        ctx.stroke();
        if (isWaterTile(gx, gy) && (gx * 13 + gy * 7) % 5 === 0) {
          const sway = Math.sin(now / 680 + gx * .8 + gy) * 2;
          ctx.strokeStyle = "rgba(239,255,235,.38)";
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(p.x - 5 + sway, p.y - 2);
          ctx.quadraticCurveTo(p.x + sway, p.y - 4, p.x + 5 + sway, p.y - 2);
          ctx.stroke();
        } else if (!isWaterTile(gx, gy) && !tilePath(gx, gy) && island < .75 && (gx * 19 + gy * 31) % 29 === 0) {
          ctx.fillStyle = "rgba(255,242,187,.8)";
          ctx.beginPath(); ctx.arc(p.x + 3, p.y - 2, 1.25, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
  }
  function drawTree(object, now) {
    const p = project(object.x, object.y);
    const sway = Math.sin(now / 930 + object.x * .9) * 1.5;
    ctx.fillStyle = "rgba(50,95,56,.2)";
    ctx.beginPath(); ctx.ellipse(p.x + 3, p.y - 2, dimensions.tileW * .39, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#8b5939";
    ctx.fillRect(p.x - 4, p.y - 25, 9, 25);
    ctx.fillStyle = "#70472f";
    ctx.fillRect(p.x + 1, p.y - 23, 4, 23);
    ctx.fillStyle = "#659b69";
    ctx.beginPath(); ctx.arc(p.x - 10 + sway, p.y - 34, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#75ad70";
    ctx.beginPath(); ctx.arc(p.x + 7 + sway, p.y - 38, 17, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#8cbd78";
    ctx.beginPath(); ctx.arc(p.x - 2 + sway, p.y - 47, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(199,225,139,.62)";
    ctx.beginPath(); ctx.arc(p.x - 7 + sway, p.y - 46, 5, 0, Math.PI * 2); ctx.fill();
    [[-8, -31], [9, -38], [1, -52]].forEach(([dx, dy], i) => {
      if ((object.x + object.y + i) % 3 !== 0) {
        ctx.fillStyle = "#e66f5f";
        ctx.beginPath(); ctx.arc(p.x + dx + sway, p.y + dy, 3, 0, Math.PI * 2); ctx.fill();
      }
    });
  }
  function drawRock(object) {
    const p = project(object.x, object.y);
    ctx.fillStyle = "rgba(65,94,66,.16)";
    ctx.beginPath(); ctx.ellipse(p.x + 2, p.y - 1, 13, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#8e9c7d";
    ctx.beginPath(); ctx.moveTo(p.x - 11, p.y - 4); ctx.lineTo(p.x - 8, p.y - 14); ctx.lineTo(p.x - 2, p.y - 19); ctx.lineTo(p.x + 7, p.y - 17); ctx.lineTo(p.x + 12, p.y - 8); ctx.lineTo(p.x + 10, p.y - 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#b9c1a0";
    ctx.beginPath(); ctx.ellipse(p.x - 2, p.y - 13, 5, 2.2, -.4, 0, Math.PI * 2); ctx.fill();
  }
  function drawPickup(object, now) {
    if (state.collected.includes(object.id)) return;
    const p = project(object.x, object.y);
    const float = Math.sin(now / 400 + object.x * 2) * 1.5;
    ctx.fillStyle = "rgba(53,94,58,.18)";
    ctx.beginPath(); ctx.ellipse(p.x, p.y - 1, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
    if (object.type === "shell") {
      ctx.fillStyle = "#fff0d5";
      ctx.beginPath(); ctx.ellipse(p.x, p.y - 6 + float, 5.3, 4, -.25, Math.PI, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#d3a57c"; ctx.lineWidth = .8;
      ctx.beginPath(); ctx.moveTo(p.x - 4, p.y - 5 + float); ctx.quadraticCurveTo(p.x, p.y - 11 + float, p.x + 4, p.y - 5 + float); ctx.stroke();
    } else if (object.type === "wood") {
      ctx.strokeStyle = "#8e6545"; ctx.lineWidth = 6; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(p.x - 6, p.y - 6 + float); ctx.lineTo(p.x + 6, p.y - 5 + float); ctx.stroke();
      ctx.strokeStyle = "#c29462"; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(p.x - 5, p.y - 7 + float); ctx.lineTo(p.x + 4, p.y - 6 + float); ctx.stroke();
    } else if (object.type === "weed") {
      ctx.strokeStyle = "#5c9a5c"; ctx.lineWidth = 2; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(p.x, p.y - 3); ctx.quadraticCurveTo(p.x - 2, p.y - 13 + float, p.x - 5, p.y - 14 + float); ctx.moveTo(p.x, p.y - 3); ctx.quadraticCurveTo(p.x + 2, p.y - 12 + float, p.x + 6, p.y - 11 + float); ctx.stroke();
    } else if (object.type === "flower") {
      for (let i = 0; i < 5; i += 1) {
        const angle = (i * Math.PI * 2) / 5;
        ctx.fillStyle = i % 2 ? "#ffdb89" : "#fff0c9";
        ctx.beginPath(); ctx.arc(p.x + Math.cos(angle) * 3, p.y - 9 + float + Math.sin(angle) * 3, 2.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = "#e99b57"; ctx.beginPath(); ctx.arc(p.x, p.y - 9 + float, 1.8, 0, Math.PI * 2); ctx.fill();
    }
  }
  function drawHome(prop) {
    const p = project(prop.x, prop.y);
    ctx.fillStyle = "rgba(62,91,57,.2)";
    ctx.beginPath(); ctx.ellipse(p.x + 1, p.y - 2, 30, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e8b478";
    ctx.beginPath(); ctx.moveTo(p.x - 23, p.y - 8); ctx.lineTo(p.x + 19, p.y - 8); ctx.lineTo(p.x + 19, p.y - 38); ctx.lineTo(p.x - 23, p.y - 38); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#d79d66"; ctx.fillRect(p.x + 8, p.y - 35, 11, 27);
    ctx.fillStyle = "#fff2cd"; ctx.fillRect(p.x - 14, p.y - 28, 9, 9);
    ctx.fillStyle = "#a96954";
    ctx.beginPath(); ctx.moveTo(p.x - 29, p.y - 37); ctx.lineTo(p.x - 1, p.y - 59); ctx.lineTo(p.x + 26, p.y - 37); ctx.lineTo(p.x + 20, p.y - 33); ctx.lineTo(p.x - 1, p.y - 50); ctx.lineTo(p.x - 24, p.y - 33); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#f4d897"; ctx.fillRect(p.x - 3, p.y - 20, 10, 12);
  }
  function drawHall(prop) {
    const p = project(prop.x, prop.y);
    ctx.fillStyle = "rgba(59,89,59,.18)";
    ctx.beginPath(); ctx.ellipse(p.x + 1, p.y - 2, 35, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f2dfa9";
    ctx.fillRect(p.x - 28, p.y - 38, 53, 34);
    ctx.fillStyle = "#d7bf84";
    ctx.beginPath(); ctx.moveTo(p.x + 12, p.y - 38); ctx.lineTo(p.x + 25, p.y - 38); ctx.lineTo(p.x + 25, p.y - 4); ctx.lineTo(p.x + 12, p.y - 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#c9885a";
    ctx.beginPath(); ctx.moveTo(p.x - 34, p.y - 37); ctx.lineTo(p.x - 2, p.y - 61); ctx.lineTo(p.x + 31, p.y - 37); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#f9edc8"; ctx.fillRect(p.x - 11, p.y - 28, 10, 10);
    ctx.fillStyle = "#8c6a4d"; ctx.fillRect(p.x + 3, p.y - 26, 9, 22);
    ctx.fillStyle = "#9baf79"; ctx.fillRect(p.x - 1, p.y - 68, 3, 12);
    ctx.fillStyle = "#fff0be"; ctx.beginPath(); ctx.arc(p.x, p.y - 71, 5, 0, Math.PI * 2); ctx.fill();
  }
  function drawPier(prop) {
    const p = project(prop.x, prop.y);
    ctx.fillStyle = "rgba(46,109,126,.22)";
    ctx.beginPath(); ctx.ellipse(p.x + 3, p.y + 1, 30, 8, -.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#926844"; ctx.lineWidth = 12; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(p.x - 24, p.y - 28); ctx.lineTo(p.x + 21, p.y + 5); ctx.stroke();
    ctx.strokeStyle = "#c3915e"; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(p.x - 24, p.y - 28); ctx.lineTo(p.x + 21, p.y + 5); ctx.stroke();
    ctx.strokeStyle = "#e1ba80"; ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i += 1) {
      const x = p.x + i * 11;
      ctx.beginPath(); ctx.moveTo(x - 3, p.y - 29 + i * 8); ctx.lineTo(x + 3, p.y - 35 + i * 8); ctx.stroke();
    }
    ctx.fillStyle = "#e9d3a1"; ctx.beginPath(); ctx.arc(p.x + 24, p.y + 8, 4, 0, Math.PI * 2); ctx.fill();
  }
  function drawPlayer(now) {
    const p = project(state.player.x, state.player.y, 0);
    const walking = state.keys.size > 0 || Boolean(state.target);
    const bob = walking ? Math.abs(Math.sin(now / 90)) * 2 : Math.sin(now / 410) * 1.2;
    ctx.fillStyle = "rgba(52,95,57,.24)";
    ctx.beginPath(); ctx.ellipse(p.x + 1, p.y - 2, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#79ae88";
    ctx.beginPath(); ctx.ellipse(p.x - 7, p.y - 15 - bob, 5, 7, -.15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#efbc78";
    ctx.beginPath(); ctx.ellipse(p.x + 1, p.y - 18 - bob, 7, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#eea868";
    ctx.beginPath(); ctx.arc(p.x + 1, p.y - 32 - bob, 8.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#704d3d";
    ctx.beginPath(); ctx.arc(p.x + 1, p.y - 35 - bob, 8, Math.PI, Math.PI * 2); ctx.lineTo(p.x + 9, p.y - 29 - bob); ctx.quadraticCurveTo(p.x + 1, p.y - 32 - bob, p.x - 7, p.y - 29 - bob); ctx.closePath(); ctx.fill();
    if (state.facing !== "up") {
      ctx.fillStyle = "#4d5540";
      ctx.beginPath(); ctx.arc(p.x - 1.5, p.y - 31 - bob, 1, 0, Math.PI * 2); ctx.arc(p.x + 3.7, p.y - 31 - bob, 1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#dd7862";
    ctx.beginPath(); ctx.moveTo(p.x - 7, p.y - 24 - bob); ctx.quadraticCurveTo(p.x + 1, p.y - 21 - bob, p.x + 8, p.y - 25 - bob); ctx.lineTo(p.x + 7, p.y - 14 - bob); ctx.quadraticCurveTo(p.x + 1, p.y - 10 - bob, p.x - 6, p.y - 15 - bob); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#f3c985";
    ctx.beginPath(); ctx.ellipse(p.x - 7, p.y - 19 - bob, 2.7, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#678962";
    ctx.beginPath(); ctx.ellipse(p.x - 3, p.y - 8, 3, 2, 0, 0, Math.PI * 2); ctx.ellipse(p.x + 5, p.y - 8, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
  }
  function drawFishing(now) {
    if (!state.fishing || !state.fishing.target) return;
    const player = project(state.player.x, state.player.y, 23);
    const bobber = project(state.fishing.target.x, state.fishing.target.y);
    ctx.strokeStyle = "rgba(252,250,224,.9)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(player.x + 3, player.y - 4); ctx.quadraticCurveTo((player.x + bobber.x) / 2 + 7, (player.y + bobber.y) / 2, bobber.x, bobber.y - 2); ctx.stroke();
    const ripple = 4 + ((Math.sin(now / 170) + 1) * 2);
    ctx.strokeStyle = "rgba(255,255,239,.7)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(bobber.x, bobber.y - 1, ripple + 2, ripple * .42, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#ed7d64"; ctx.beginPath(); ctx.arc(bobber.x, bobber.y - 3, 3.3, 0, Math.PI * 2); ctx.fill();
  }
  function drawWorld(now) {
    drawTerrain(now);
    const renderables = [...props, ...objects.filter((object) => !state.collected.includes(object.id) && !(object.type === "rock" && state.tappedRocks.includes(object.id))), { id: "player", type: "player", x: state.player.x, y: state.player.y }];
    renderables.sort((a, b) => (a.x + a.y) - (b.x + b.y));
    for (const item of renderables) {
      if (item.type === "tree") drawTree(item, now);
      else if (item.type === "rock") drawRock(item);
      else if (item.type === "home") drawHome(item);
      else if (item.type === "hall") drawHall(item);
      else if (item.type === "pier") drawPier(item);
      else if (item.type === "player") drawPlayer(now);
      else drawPickup(item, now);
    }
    const near = nearestObject();
    if (near) {
      const p = project(near.object.x, near.object.y, near.object.type === "tree" ? 57 : 19);
      const r = 7 + Math.sin(now / 190) * 1.2;
      ctx.strokeStyle = "rgba(255,246,199,.95)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke();
    }
    drawFishing(now);
  }
  function updateClock(now) {
    const totalMinutes = (9 * 60 + 12 + Math.floor(now / 30000)) % (24 * 60);
    const hour24 = Math.floor(totalMinutes / 60);
    const hour = hour24 % 12 || 12;
    const minute = totalMinutes % 60;
    const displayed = `${hour}:${String(minute).padStart(2, "0")} ${hour24 < 12 ? "AM" : "PM"}`;
    document.getElementById("island-time").textContent = displayed;
  }
  function frame(timestamp) {
    if (!state.lastTimestamp) state.lastTimestamp = timestamp;
    const dt = Math.min((timestamp - state.lastTimestamp) / 1000, .05);
    state.lastTimestamp = timestamp;
    movePlayer(dt);
    if (state.fishing) {
      state.fishing.time -= dt;
      if (state.fishing.time <= 0) finishFishing();
    }
    if (state.toastTimer > 0) {
      state.toastTimer -= dt;
      if (state.toastTimer <= 0) toastEl.classList.remove("show");
    }
    if (timestamp - state.lastSave > 8000) { save(); state.lastSave = timestamp; }
    drawWorld(timestamp);
    refreshPrompt();
    updateClock(timestamp);
    requestAnimationFrame(frame);
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const rect = canvas.getBoundingClientRect();
    const sx = event.clientX - rect.left - dimensions.width / 2;
    const sy = event.clientY - rect.top - dimensions.top;
    const isoX = sx / dimensions.tileW * 2;
    const isoY = sy / dimensions.tileH * 2;
    const gx = (isoX + isoY) / 2;
    const gy = (isoY - isoX) / 2;
    const tx = Math.max(0, Math.min(19, gx));
    const ty = Math.max(0, Math.min(17, gy));
    if (!isWalkable(tx, ty)) { showToast("The tide keeps this path for itself."); return; }
    state.fishing = null;
    state.target = { x: tx, y: ty };
    state.targetObjectId = null;
    let clicked = null;
    for (const object of objects) {
      if (state.collected.includes(object.id)) continue;
      if (object.type === "rock" && state.tappedRocks.includes(object.id)) continue;
      const distance = Math.hypot(tx - object.x, ty - object.y);
      if (distance < .72 && (!clicked || distance < clicked.distance)) clicked = { object, distance };
    }
    if (clicked) {
      const angle = Math.atan2(state.player.y - clicked.object.y, state.player.x - clicked.object.x);
      state.target = { x: clicked.object.x + Math.cos(angle) * .8, y: clicked.object.y + Math.sin(angle) * .8 };
      if (isWalkable(state.target.x, state.target.y)) state.targetObjectId = clicked.object.id;
    }
  });
  window.addEventListener("keydown", (event) => {
    setMoveKey(event.code, true);
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) event.preventDefault();
    if (event.repeat) return;
    if (event.code === "KeyE" || event.code === "Space") interact();
    if (event.code === "KeyF") startFishing();
    if (event.code === "Escape") helpCard.hidden = true;
  });
  window.addEventListener("keyup", (event) => setMoveKey(event.code, false));
  window.addEventListener("blur", () => { state.keys.clear(); });
  window.addEventListener("resize", resizeCanvas);
  document.getElementById("close-help").addEventListener("click", () => { helpCard.hidden = true; });
  helpButton.addEventListener("click", () => { helpCard.hidden = !helpCard.hidden; });
  pickButton.addEventListener("click", interact);
  fishButton.addEventListener("click", startFishing);
  sellButton.addEventListener("click", sellFinds);

  document.querySelectorAll(".dpad button").forEach((button) => {
    const directionKey = { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" }[button.dataset.move];
    const down = (event) => {
      event.preventDefault();
      setMoveKey(directionKey, true);
      button.classList.add("pressed");
      try { button.setPointerCapture(event.pointerId); } catch (_) { /* Pointer capture is optional. */ }
    };
    const up = (event) => {
      event.preventDefault();
      setMoveKey(directionKey, false);
      button.classList.remove("pressed");
    };
    button.addEventListener("pointerdown", down);
    button.addEventListener("pointerup", up);
    button.addEventListener("pointercancel", up);
    button.addEventListener("lostpointercapture", up);
    button.addEventListener("contextmenu", (event) => event.preventDefault());
  });

  resizeCanvas();
  updateUI();
  requestAnimationFrame(frame);
})();
