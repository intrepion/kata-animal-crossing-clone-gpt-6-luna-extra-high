(() => {
  const $ = (id) => document.getElementById(id);
  const world = $("world");
  const ctx = world.getContext("2d");
  const characterSheet = new Image();
  characterSheet.src = "assets/island-residents.png";
  const minimap = $("minimap");
  const miniCtx = minimap.getContext("2d");
  const mapPreview = $("map-preview");
  const previewCtx = mapPreview.getContext("2d");
  const W = 24;
  const H = 18;
  const SAVE_KEY = "mosswharf-new-horizons-v2";
  const items = {
    apple: { name: "Apple", icon: "🍎", price: 100 },
    coconut: { name: "Coconut", icon: "🥥", price: 250 },
    branch: { name: "Tree branch", icon: "🪵", price: 50 },
    wood: { name: "Wood", icon: "🪵", price: 60 },
    softwood: { name: "Softwood", icon: "🪵", price: 60 },
    hardwood: { name: "Hardwood", icon: "🪵", price: 60 },
    stone: { name: "Stone", icon: "🪨", price: 75 },
    clay: { name: "Clay", icon: "🟤", price: 100 },
    iron: { name: "Iron nugget", icon: "⚙️", price: 375 },
    fossil: { name: "Fossil", icon: "🦴", price: 1000 },
    shell: { name: "Sea shell", icon: "🐚", price: 90 },
    fish: { name: "Sea bass", icon: "🐟", price: 400 },
    butterfly: { name: "Common butterfly", icon: "🦋", price: 160 },
    weed: { name: "Clump of weeds", icon: "🌿", price: 10 },
    flower: { name: "Wildflower", icon: "🌼", price: 40 },
    medicine: { name: "Medicine", icon: "🧴", price: 0 },
    campfire: { name: "Simple campfire", icon: "🔥", price: 0 },
  };
  const recipes = [
    { id: "net", name: "Flimsy net", icon: "🪰", material: { branch: 5 }, tool: "net", uses: 20 },
    { id: "rod", name: "Flimsy fishing rod", icon: "🎣", material: { branch: 5 }, tool: "rod", uses: 20 },
    { id: "axe", name: "Stone axe", icon: "🪓", material: { branch: 5, stone: 1 }, tool: "axe", uses: 30 },
    { id: "shovel", name: "Flimsy shovel", icon: "⛏️", material: { branch: 5, stone: 1 }, tool: "shovel", uses: 20 },
    { id: "campfire", name: "Simple campfire", icon: "🔥", material: { branch: 3, wood: 2 }, item: "campfire" },
  ];
  const defaultState = {
    bells: 5000,
    loan: 98000,
    homeLevel: 1,
    miles: 320,
    inventory: { apple: 2, branch: 5, shell: 1 },
    tools: { net: 18, rod: 18, axe: 16, shovel: 18 },
    selectedTool: "net",
    picked: [],
    tappedRocks: {},
    choppedTrees: {},
    shakenTrees: {},
    fruitDrops: [],
    furniture: [],
    player: { x: 10.2, y: 10.1 },
    donatedFossils: 0,
    stats: { steps: 0, fruit: 0, fish: 0, bugs: 0, fossils: 0, sales: 0, crafted: 0 },
    notices: { shells: false, fruit: false, caught: false },
    islandName: "MOSSWHARF",
  };
  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (!saved || !saved.inventory) return structuredClone(defaultState);
      const state = { ...structuredClone(defaultState), ...saved };
      state.inventory = { ...defaultState.inventory, ...saved.inventory };
      state.tools = { ...defaultState.tools, ...saved.tools };
      state.stats = { ...defaultState.stats, ...saved.stats };
      state.notices = { ...defaultState.notices, ...saved.notices };
      state.player = { ...defaultState.player, ...saved.player };
      state.picked = Array.isArray(saved.picked) ? saved.picked : [];
      state.fruitDrops = Array.isArray(saved.fruitDrops) ? saved.fruitDrops : [];
      state.furniture = Array.isArray(saved.furniture) ? saved.furniture : [];
      return state;
    } catch (_) {
      return structuredClone(defaultState);
    }
  }
  const state = loadState();
  const keys = new Set();
  const dims = { width: 0, height: 0, ratio: 1, tileW: 50, tileH: 28 };
  const trees = [
    [3, 5, "fruit"], [5, 3, "fruit"], [8, 4, "fruit"], [17, 3, "fruit"], [20, 6, "fruit"], [4, 10, "fruit"],
    [6, 14, "fruit"], [10, 15, "fruit"], [17, 14, "fruit"], [20, 11, "fruit"], [4, 7, "cedar"], [15, 5, "cedar"],
    [18, 10, "cedar"], [12, 12, "cedar"], [2.7, 13, "palm"], [21, 13, "palm"],
  ].map(([x, y, kind], i) => ({ id: `tree-${i}`, type: "tree", x, y, kind }));
  const rocks = [[7, 7], [16, 10], [5, 12]].map(([x, y], i) => ({ id: `rock-${i}`, type: "rock", x, y }));
  const fossils = [[10, 5], [19, 9], [8, 13]].map(([x, y], i) => ({ id: `fossil-${i}`, type: "fossil", x, y }));
  const pickups = [
    { id: "shell-0", type: "pickup", item: "shell", x: 6.8, y: 14.2 },
    { id: "shell-1", type: "pickup", item: "shell", x: 12.1, y: 16.2 },
    { id: "shell-2", type: "pickup", item: "shell", x: 18.7, y: 15.1 },
    { id: "branch-0", type: "pickup", item: "branch", x: 9.0, y: 10.6 },
    { id: "branch-1", type: "pickup", item: "branch", x: 14.2, y: 11.7 },
    { id: "branch-2", type: "pickup", item: "branch", x: 18.2, y: 6.1 },
    { id: "weed-0", type: "pickup", item: "weed", x: 9.2, y: 6.2 },
    { id: "weed-1", type: "pickup", item: "weed", x: 13.9, y: 12.7 },
    { id: "flower-0", type: "pickup", item: "flower", x: 6.2, y: 9.7 },
    { id: "flower-1", type: "pickup", item: "flower", x: 17.8, y: 8.2 },
  ];
  const buildings = [
    { id: "home", type: "home", x: 8.1, y: 10.5 },
    { id: "museum", type: "museum", x: 5.2, y: 6.3 },
    { id: "services", type: "services", x: 12.8, y: 7.0 },
    { id: "shop", type: "shop", x: 17.2, y: 7.3 },
    { id: "camp", type: "camp", x: 4.2, y: 11.0 },
    { id: "pier", type: "pier", x: 20.3, y: 14.8 },
  ];
  const animals = [
    { id: "tilly", name: "Tilly", title: "resident representative", icon: "🦦", x: 12.0, y: 8.2, kind: "otter" },
    { id: "juniper", name: "Juniper", title: "your island neighbor", icon: "🦊", x: 14.5, y: 10.3, kind: "fox" },
    { id: "blathers", name: "Blathers", title: "museum curator", icon: "🦉", x: 5.2, y: 8.1, kind: "owl" },
    { id: "timmy", name: "Timmy", title: "Nook's Cranny shopkeeper", icon: "🦝", x: 17.2, y: 8.45, kind: "tanuki" },
  ];
  const flowers = [[5, 8], [6, 8], [7, 9], [9, 12], [11, 11], [14, 5], [18, 9], [19, 12], [7, 15], [14, 15], [16, 13]];
  let fishingSpot = { x: 12.8, y: 8.1 };
  let stateTime = performance.now();
  let lastFrame = 0;
  let toastTimeout = 0;
  let saveTimeout = 0;
  let lastAutoSave = performance.now();
  let walkTarget = null;
  let fishing = null;
  let bug = { x: 7.3, y: 7.6, cooldown: 0 };
  let lastInteraction = null;
  let dialogueReturnPage = null;

  function save() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(persistNow, 80);
  }
  function persistNow() {
    clearTimeout(saveTimeout);
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (_) { /* Storage is optional. */ }
  }
  function bagCount() { return Object.values(state.inventory).reduce((sum, n) => sum + Math.max(0, Number(n) || 0), 0); }
  function toast(message) {
    const el = $("world-toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => el.classList.remove("show"), 2300);
  }
  function awardMiles(amount, message) {
    state.miles += amount;
    toast(message || `+${amount} Nook Miles earned!`);
  }
  function addItem(id, amount = 1, message = null) {
    if (bagCount() + amount > 20) { toast("Your pockets are full! Open your NookPhone to make room."); return false; }
    state.inventory[id] = (state.inventory[id] || 0) + amount;
    if (id === "apple" || id === "coconut") state.stats.fruit += amount;
    if (id === "fish") state.stats.fish += amount;
    if (id === "butterfly") state.stats.bugs += amount;
    updateHud();
    save();
    if (message) toast(message);
    return true;
  }
  function removeItems(cost) {
    for (const [item, count] of Object.entries(cost)) if ((state.inventory[item] || 0) < count) return false;
    for (const [item, count] of Object.entries(cost)) state.inventory[item] -= count;
    return true;
  }
  function updateHud() {
    $("bell-count").textContent = state.bells.toLocaleString();
    $("loan-count").textContent = state.loan.toLocaleString();
    $("loan-progress").style.width = `${Math.max(4, Math.min(100, ((loanPrincipal() - state.loan) / loanPrincipal()) * 100))}%`;
    document.querySelectorAll(".tool-slot").forEach((slot) => {
      const tool = slot.dataset.tool;
      const percent = Math.max(0, Math.min(100, (state.tools[tool] / 30) * 100));
      slot.querySelector(".durability b").style.width = `${percent}%`;
      slot.querySelector(".durability b").style.background = percent < 25 ? "#d7775c" : "#91b67e";
      slot.classList.toggle("selected", tool === state.selectedTool);
    });
    const selected = document.querySelector(`.tool-slot[data-tool="${state.selectedTool}"]`);
    if (selected) $("use-tool-icon").textContent = selected.querySelector("span").textContent;
  }
  function loanPrincipal() { return state.homeLevel === 1 ? 98000 : 198000 * (state.homeLevel - 1); }
  function homeUpgradeCost() { return 198000 * state.homeLevel; }
  function selectTool(tool) {
    if (!state.tools[tool]) { toast(`No ${tool} in your pockets. Craft one from DIY Recipes.`); return; }
    state.selectedTool = tool;
    updateHud();
  }

  function resize() {
    const rect = world.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    dims.width = rect.width;
    dims.height = rect.height;
    dims.ratio = Math.min(window.devicePixelRatio || 1, 2);
    world.width = Math.round(rect.width * dims.ratio);
    world.height = Math.round(rect.height * dims.ratio);
    ctx.setTransform(dims.ratio, 0, 0, dims.ratio, 0, 0);
    const requested = rect.width < 620 ? 44 : 72;
    dims.tileW = Math.min(requested, Math.max(44, rect.width / 18));
    dims.tileH = dims.tileW * 0.56;
  }
  function project(x, y, lift = 0) {
    return projectRaw(x, y, lift + groundHeight(x, y));
  }
  function projectRaw(x, y, lift = 0) {
    const dx = x - state.player.x;
    const dy = y - state.player.y;
    return { x: dims.width / 2 + (dx - dy) * dims.tileW / 2, y: dims.height * 0.51 + (dx + dy) * dims.tileH / 2 - lift };
  }
  function groundHeight(x, y) {
    return y < 4.8 && islandDistance(x, y) < .98 && pondDistance(x, y) > 1.6 && !isRiver(x, y) ? 18 : 0;
  }
  function toGrid(screenX, screenY) {
    const dx = (screenX - dims.width / 2) * 2 / dims.tileW;
    const dy = (screenY - dims.height * 0.51) * 2 / dims.tileH;
    return { x: state.player.x + (dx + dy) / 2, y: state.player.y + (dy - dx) / 2 };
  }
  function islandDistance(x, y) {
    const dx = (x - 11.6) / 11.5;
    const dy = (y - 8.6) / 8.25;
    return Math.hypot(dx, dy);
  }
  function riverCenter(y) { return 11.45 + Math.sin((y - 2.5) * .43) * 3.05; }
  function riverDistance(x, y) { return Math.abs(x - riverCenter(y)); }
  function pondDistance(x, y) { return Math.hypot((x - 6.0) / 1.7, (y - 4.7) / 1.4); }
  function isRiver(x, y) { return y > 1.7 && y < 16.4 && riverDistance(x, y) < .67; }
  function isWater(x, y) { return islandDistance(x, y) > 1.0 || isRiver(x, y) || pondDistance(x, y) < 1; }
  function isBridge(x, y) { return Math.abs(y - 9.2) < .58 && riverDistance(x, y) < 1.2; }
  function isWalkable(x, y) {
    if (x < .1 || y < .1 || x > W - .1 || y > H - .1) return false;
    if (islandDistance(x, y) > .91) return false;
    if (pondDistance(x, y) < 1.35) return false;
    if (isRiver(x, y) && !isBridge(x, y)) return false;
    return true;
  }
  function canFishNear(x = state.player.x, y = state.player.y) {
    if (pondDistance(x, y) < 2.05) return true;
    if (riverDistance(x, y) < 2.0 && y > 2 && y < 16) return true;
    return islandDistance(x, y) > .79 && islandDistance(x, y) < 1.18;
  }
  function groundObjects() {
    return [...pickups.filter((p) => !state.picked.includes(p.id)), ...state.fruitDrops];
  }
  function nearestTarget() {
    const options = [];
    const push = (object, label, icon, priority = 0) => {
      const distance = Math.hypot(state.player.x - object.x, state.player.y - object.y);
      if (distance < 1.55) options.push({ object, label, icon, distance, priority });
    };
    for (const item of groundObjects()) push(item, `Pick up ${items[item.item]?.name || "fruit"}`, items[item.item]?.icon || "✦", 2);
    for (const tree of trees) {
      const last = state.shakenTrees[tree.id] || 0;
      if (tree.kind === "fruit" && Date.now() - last > 10000) push(tree, "Shake tree", "🍎", 1);
      else if (tree.kind === "palm" && Date.now() - last > 10000) push(tree, "Shake palm tree", "🥥", 1);
    }
    for (const rock of rocks) if ((state.tappedRocks[rock.id] || 0) < 3) push(rock, "Hit rock", "🪨", 0);
    for (const fossil of fossils) if (!state.picked.includes(fossil.id)) push(fossil, "Dig up fossil", "🦴", 2);
    const special = [
      { id: "services", x: 12.8, y: 8.1, label: "Resident Services", icon: "🏕️" },
      { id: "shop", x: 17.2, y: 8.3, label: "Nook's Cranny", icon: "🏪" },
      { id: "home", x: 8.1, y: 11.2, label: "Go inside your home", icon: "🏠" },
      { id: "museum", x: 5.2, y: 8.6, label: "Visit the museum", icon: "🏛️" },
      { id: "juniper", x: animals[1].x, y: animals[1].y, label: "Talk to Juniper", icon: "🦊" },
      { id: "tilly", x: animals[0].x, y: animals[0].y, label: "Talk to Tilly", icon: "🦦" },
      { id: "blathers", x: animals[2].x, y: animals[2].y, label: "Talk to Blathers", icon: "🦉" },
      { id: "timmy", x: animals[3].x, y: animals[3].y, label: "Talk to Timmy", icon: "🦝" },
    ];
    for (const object of special) push(object, object.label, object.icon, 3);
    options.sort((a, b) => a.distance - b.distance || b.priority - a.priority);
    return options[0] || null;
  }
  function interactionHint(target) {
    const el = $("interaction-hint");
    if (!target || dialogueVisible() || !$("screen-overlay").hidden) { el.hidden = true; return; }
    const p = project(target.object.x, target.object.y, 55);
    el.hidden = false;
    el.style.left = `${Math.max(70, Math.min(dims.width - 70, p.x))}px`;
    el.style.top = `${Math.max(90, Math.min(dims.height - 105, p.y))}px`;
    $("interaction-copy").textContent = target.label.toUpperCase();
  }
  function dialogueVisible() { return !$("dialogue-box").hidden; }

  function worldPath(points, close = false) {
    ctx.beginPath();
    points.forEach(([x, y], index) => {
      const p = project(x, y);
      if (!index) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    });
    if (close) ctx.closePath();
  }
  function ellipsePoints(cx, cy, rx, ry, steps = 96) {
    return Array.from({ length: steps + 1 }, (_, index) => {
      const angle = (index / steps) * Math.PI * 2;
      return [cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry];
    });
  }
  function drawOcean(now) {
    const grad = ctx.createLinearGradient(0, 0, 0, dims.height);
    grad.addColorStop(0, "#91d6dc"); grad.addColorStop(.46, "#78c7d2"); grad.addColorStop(1, "#65b8c7");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, dims.width, dims.height);
    for (let i = 0; i < 44; i += 1) {
      const x = (i * 139 + Math.sin(now / 1800 + i * .7) * 15) % (dims.width + 50) - 25;
      const y = (i * 83 + 29) % dims.height;
      ctx.strokeStyle = `rgba(235,255,236,${.17 + (i % 4) * .035})`;
      ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.ellipse(x, y, 8 + (i % 4) * 2, 2.5, -.1, .2, Math.PI - .3); ctx.stroke();
    }
  }
  function pathTile(x, y) {
    const segments = [
      [[8.1, 10.2], [12.8, 8.0]], [[12.8, 8], [17.1, 7.6]], [[8.4, 10.5], [5.0, 11.2]], [[12.2, 8.3], [12.0, 10.5]],
    ];
    return segments.some(([[ax, ay], [bx, by]]) => {
      const dx = bx - ax; const dy = by - ay;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
      return Math.hypot(x - (ax + dx * t), y - (ay + dy * t)) < .7;
    });
  }
  function drawTerrain(now) {
    drawOcean(now);
    const shoreline = [];
    for (let i = 0; i <= 180; i += 1) {
      const angle = (i / 180) * Math.PI * 2;
      shoreline.push([11.6 + Math.cos(angle) * 11.5, 8.6 + Math.sin(angle) * 8.25]);
    }
    worldPath(shoreline, true);
    const grass = ctx.createLinearGradient(0, dims.height * .2, dims.width, dims.height);
    grass.addColorStop(0, "#9dcc7e"); grass.addColorStop(.5, "#90c274"); grass.addColorStop(1, "#84b96b");
    ctx.fillStyle = grass; ctx.fill();
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.strokeStyle = "#e5d49a"; ctx.lineWidth = dims.tileW * .92; ctx.stroke();
    ctx.strokeStyle = "rgba(255,247,211,.68)"; ctx.lineWidth = 2.2; ctx.stroke();

    worldPath(ellipsePoints(6, 4.7, 1.53, 1.2), true);
    ctx.fillStyle = "#e3cf94"; ctx.fill();
    worldPath(ellipsePoints(6, 4.7, 1.19, .88), true);
    const pond = ctx.createLinearGradient(0, dims.height * .12, 0, dims.height * .43);
    pond.addColorStop(0, "#80ced4"); pond.addColorStop(1, "#66b8c6"); ctx.fillStyle = pond; ctx.fill();
    ctx.strokeStyle = "rgba(243,255,225,.63)"; ctx.lineWidth = 1.5; ctx.stroke();

    const river = [];
    for (let y = 1.7; y <= 16.45; y += .12) river.push([riverCenter(y), y]);
    worldPath(river);
    ctx.strokeStyle = "#e1d093"; ctx.lineWidth = dims.tileW * .87; ctx.stroke();
    worldPath(river);
    const water = ctx.createLinearGradient(0, dims.height * .2, dims.width, dims.height * .8);
    water.addColorStop(0, "#80d0d6"); water.addColorStop(.5, "#72c4d0"); water.addColorStop(1, "#64b8c7");
    ctx.strokeStyle = water; ctx.lineWidth = dims.tileW * .64; ctx.stroke();
    ctx.strokeStyle = "rgba(241,255,228,.28)"; ctx.lineWidth = 1.6; ctx.stroke();

    const paths = [
      [[8.1, 10.2], [12.8, 8]], [[12.8, 8], [17.1, 7.6]],
      [[8.4, 10.5], [5, 11.2]], [[12.2, 8.3], [12, 10.5]],
    ];
    for (const segment of paths) {
      worldPath(segment);
      ctx.strokeStyle = "rgba(105,123,79,.2)"; ctx.lineWidth = dims.tileW * .46; ctx.stroke();
      worldPath(segment);
      ctx.strokeStyle = "#d0c08e"; ctx.lineWidth = dims.tileW * .37; ctx.stroke();
      worldPath(segment);
      ctx.strokeStyle = "rgba(242,229,184,.4)"; ctx.lineWidth = 1.4; ctx.stroke();
    }

    for (let i = 0; i < 105; i += 1) {
      const x = ((i * 47) % 221) / 10 + .5;
      const y = ((i * 83) % 161) / 10 + .5;
      if (!isWalkable(x, y) || isRiver(x, y) || pathTile(x, y) || pondDistance(x, y) < 1.25) continue;
      if ((i * 13) % 3 !== 0) continue;
      const p = project(x, y);
      drawGrassSprig(p.x + ((i * 7) % 9) - 4, p.y + ((i * 11) % 5), .48);
    }
    drawCliffFaces();
  }
  function drawCliffFaces() {
    for (let x = 1; x < W; x += 1) {
      if (islandDistance(x + .5, 4.45) > .98 || islandDistance(x + .5, 5.45) > 1.02) continue;
      if (pondDistance(x + .5, 4.45) < 1.6 || riverDistance(x + .5, 4.45) < .8) continue;
      const a = projectRaw(x, 5, 18);
      const b = projectRaw(x + 1, 5, 18);
      const c = projectRaw(x + 1, 5, 0);
      const d = projectRaw(x, 5, 0);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath();
      const wall = ctx.createLinearGradient(a.x, a.y, d.x, d.y);
      wall.addColorStop(0, "#a8895d"); wall.addColorStop(.2, "#8c7554"); wall.addColorStop(1, "#79654c");
      ctx.fillStyle = wall; ctx.fill();
      ctx.strokeStyle = "rgba(237,218,169,.6)"; ctx.lineWidth = 1.1; ctx.stroke();
      ctx.strokeStyle = "rgba(225,202,151,.2)"; ctx.lineWidth = .7;
      ctx.beginPath(); ctx.moveTo(a.x + 2, a.y + 5); ctx.lineTo(d.x + 2, d.y - 5); ctx.moveTo(b.x - 2, b.y + 5); ctx.lineTo(c.x - 2, c.y - 5); ctx.stroke();
    }
  }
  function drawGrassSprig(x, y, scale = 1) {
    ctx.strokeStyle = "rgba(73,139,72,.62)"; ctx.lineWidth = 1.2 * scale; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 2 * scale, y - 5 * scale, x - 4 * scale, y - 5 * scale); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 1 * scale, y - 5 * scale, x + 4 * scale, y - 6 * scale); ctx.stroke();
  }
  function drawGroundDecor(now) {
    const bridgeX = riverCenter(9.2);
    const p = project(bridgeX, 9.2, 0);
    ctx.save(); ctx.translate(p.x, p.y - 3); ctx.rotate(Math.atan2(dims.tileH, dims.tileW));
    ctx.fillStyle = "rgba(53,104,102,.18)"; ctx.fillRect(-32, -3, 64, 12);
    for (let i = -3; i <= 3; i += 1) {
      ctx.fillStyle = i % 2 ? "#bd8c55" : "#d4a66a";
      ctx.fillRect(i * 9 - 4, -7, 8, 16);
    }
    ctx.fillStyle = "#866044"; ctx.fillRect(-34, -8, 68, 3); ctx.fillRect(-34, 8, 68, 3);
    ctx.restore();

    // A tiny island plaza with a circular stone apron and flower beds.
    const plaza = project(12.7, 7.8);
    ctx.fillStyle = "rgba(116,145,95,.2)"; ctx.beginPath(); ctx.ellipse(plaza.x, plaza.y + 5, dims.tileW * 1.65, dims.tileH * .85, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#d8cfaa"; ctx.beginPath(); ctx.ellipse(plaza.x, plaza.y + 1, dims.tileW * 1.56, dims.tileH * .77, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(250,244,216,.65)"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(plaza.x, plaza.y, dims.tileW * 1.28, dims.tileH * .58, 0, 0, Math.PI * 2); ctx.stroke();

    drawBench(10.5, 9.5);
    drawStreetLamp(14.3, 8.7);
    drawNoticeBoard(11.2, 7.0);
    flowers.forEach(([x, y], i) => drawFlowerBed(x, y, i));
    // A sandy crescent where the river spills into the southern sea.
    const mouth = project(riverCenter(16.1), 16.1);
    ctx.fillStyle = "rgba(242,221,164,.74)"; ctx.beginPath(); ctx.ellipse(mouth.x, mouth.y, dims.tileW * .9, dims.tileH * .58, -.3, 0, Math.PI * 2); ctx.fill();
  }
  function drawFlowerBed(x, y, seed) {
    const p = project(x, y);
    ctx.fillStyle = "rgba(68,113,68,.15)"; ctx.beginPath(); ctx.ellipse(p.x, p.y, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
    const colors = ["#f2d37b", "#e98b7a", "#f3eee0", "#d18ac0", "#ffdf88"];
    for (let i = 0; i < 3; i += 1) {
      const xoff = (i - 1) * 6;
      ctx.strokeStyle = "#5f9d63"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(p.x + xoff, p.y - 3); ctx.lineTo(p.x + xoff, p.y - 10 - ((seed + i) % 2) * 2); ctx.stroke();
      const g = ctx.createRadialGradient(p.x + xoff - 1, p.y - 12, .2, p.x + xoff, p.y - 11, 5);
      g.addColorStop(0, "#fff6db"); g.addColorStop(.4, colors[(seed + i) % colors.length]); g.addColorStop(1, colors[(seed + i) % colors.length]);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x + xoff, p.y - 12 - ((seed + i) % 2) * 2, 4, 0, Math.PI * 2); ctx.fill();
    }
  }
  function drawBench(x, y) {
    const p = project(x, y);
    ctx.fillStyle = "rgba(57,95,65,.15)"; ctx.beginPath(); ctx.ellipse(p.x, p.y, 19, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#a9784c"; ctx.fillRect(p.x - 15, p.y - 11, 30, 5); ctx.fillRect(p.x - 14, p.y - 17, 28, 6);
    ctx.fillStyle = "#805938"; ctx.fillRect(p.x - 12, p.y - 7, 3, 9); ctx.fillRect(p.x + 9, p.y - 7, 3, 9);
    ctx.fillStyle = "#bf8c59"; ctx.fillRect(p.x - 14, p.y - 17, 28, 2);
  }
  function drawStreetLamp(x, y) {
    const p = project(x, y, 0);
    ctx.fillStyle = "#776446"; ctx.fillRect(p.x - 2, p.y - 43, 4, 42); ctx.fillRect(p.x - 8, p.y - 43, 16, 3);
    ctx.fillStyle = "#7a8860"; ctx.fillRect(p.x - 8, p.y - 52, 16, 11);
    ctx.fillStyle = "#f9e7a8"; ctx.beginPath(); ctx.arc(p.x, p.y - 47, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#8b754f"; ctx.fillRect(p.x - 10, p.y - 54, 20, 3);
  }
  function drawNoticeBoard(x, y) {
    const p = project(x, y, 0);
    ctx.fillStyle = "#815e3e"; ctx.fillRect(p.x - 2, p.y - 27, 4, 27); ctx.fillRect(p.x - 12, p.y - 31, 24, 17);
    ctx.fillStyle = "#e7d7a6"; ctx.fillRect(p.x - 9, p.y - 28, 18, 11);
    ctx.strokeStyle = "#b08154"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x - 6, p.y - 25); ctx.lineTo(p.x + 5, p.y - 25); ctx.moveTo(p.x - 6, p.y - 22); ctx.lineTo(p.x + 2, p.y - 22); ctx.stroke();
    ctx.fillStyle = "#ae794d"; ctx.beginPath(); ctx.moveTo(p.x - 15, p.y - 32); ctx.lineTo(p.x, p.y - 39); ctx.lineTo(p.x + 15, p.y - 32); ctx.closePath(); ctx.fill();
  }

  function drawTree(tree, now) {
    const p = project(tree.x, tree.y);
    const sway = Math.sin(now / 1200 + tree.x) * 1.8;
    const scale = tree.kind === "palm" ? .94 : tree.kind === "cedar" ? .98 : 1;
    ctx.fillStyle = "rgba(49,94,55,.2)"; ctx.beginPath(); ctx.ellipse(p.x + 2, p.y - 2, dims.tileW * .39, 6, 0, 0, Math.PI * 2); ctx.fill();
    if (tree.kind === "palm") {
      const trunk = ctx.createLinearGradient(p.x - 5, 0, p.x + 5, 0); trunk.addColorStop(0, "#936943"); trunk.addColorStop(.5, "#c08d5a"); trunk.addColorStop(1, "#805b3b");
      ctx.fillStyle = trunk; ctx.beginPath(); ctx.moveTo(p.x - 5, p.y); ctx.quadraticCurveTo(p.x - 2, p.y - 34, p.x + 1, p.y - 59); ctx.lineTo(p.x + 8, p.y - 58); ctx.quadraticCurveTo(p.x + 5, p.y - 25, p.x + 7, p.y); ctx.closePath(); ctx.fill();
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2 + .25;
        const endX = p.x + Math.cos(a) * 29;
        const endY = p.y - 61 + Math.sin(a) * 18;
        ctx.strokeStyle = i % 2 ? "#4f9863" : "#68ad69"; ctx.lineWidth = 5; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(p.x + 4, p.y - 61); ctx.quadraticCurveTo(p.x + Math.cos(a) * 13, p.y - 78 + Math.sin(a) * 10, endX, endY); ctx.stroke();
        ctx.strokeStyle = "rgba(204,224,135,.7)"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(p.x + 4, p.y - 60); ctx.lineTo(endX, endY); ctx.stroke();
      }
      const hasFruit = Date.now() - (state.shakenTrees[tree.id] || 0) > 10000;
      if (hasFruit) { ctx.fillStyle = "#a8793c"; [[-4, -61], [3, -62], [1, -55]].forEach(([x, y]) => { ctx.beginPath(); ctx.ellipse(p.x + x, p.y + y, 3, 4, 0, 0, Math.PI * 2); ctx.fill(); }); }
      return;
    }
    const trunk = ctx.createLinearGradient(p.x - 6, 0, p.x + 7, 0); trunk.addColorStop(0, "#8b5b3c"); trunk.addColorStop(.46, "#b77d4e"); trunk.addColorStop(1, "#81543a");
    const trunkHeight = tree.kind === "cedar" ? 36 : 31;
    ctx.fillStyle = trunk; ctx.beginPath(); ctx.moveTo(p.x - 6, p.y); ctx.lineTo(p.x - 4 + sway, p.y - trunkHeight); ctx.lineTo(p.x + 6 + sway, p.y - trunkHeight); ctx.lineTo(p.x + 7, p.y); ctx.closePath(); ctx.fill();
    if (tree.kind === "cedar") {
      for (let i = 0; i < 4; i += 1) {
        const yy = p.y - 34 - i * 9;
        const width = 25 - i * 4;
        const grad = ctx.createLinearGradient(p.x - width, yy, p.x + width, yy);
        grad.addColorStop(0, "#4f875c"); grad.addColorStop(.45, i % 2 ? "#79ad69" : "#6aa367"); grad.addColorStop(1, "#477b56");
        ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(p.x + sway, yy - 17); ctx.lineTo(p.x - width + sway, yy + 8); ctx.quadraticCurveTo(p.x + sway, yy + 3, p.x + width + sway, yy + 8); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "rgba(184,211,125,.33)"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(p.x + sway, yy - 14); ctx.lineTo(p.x - width * .47 + sway, yy + 4); ctx.stroke();
      }
    } else {
      const colors = ["#71a95f", "#83b66a", "#68a65d"];
      const blobs = [[-10, -44, 18], [9, -47, 19], [-1, -58, 18], [1, -35, 17]];
      blobs.forEach(([dx, dy, r], i) => {
        const g = ctx.createRadialGradient(p.x + dx + sway - 6, p.y + dy - 7, 2, p.x + dx + sway, p.y + dy, r + 2);
        g.addColorStop(0, ["#a4cd79", "#b0d47e", "#95c675"][i % 3]); g.addColorStop(.48, colors[i % colors.length]); g.addColorStop(1, ["#59935d", "#5a955b", "#4e8a58"][i % 3]);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x + dx + sway, p.y + dy, r * scale, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(211,231,155,.28)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.x + dx + sway - 1, p.y + dy - 1, r * .83, 3.45, 5.35); ctx.stroke();
      });
      if (tree.kind === "fruit" && Date.now() - (state.shakenTrees[tree.id] || 0) > 10000) {
        [[-10, -40], [9, -46], [4, -32]].forEach(([dx, dy], i) => {
          ctx.fillStyle = "#cf5c47"; ctx.beginPath(); ctx.arc(p.x + dx + sway + i * .4, p.y + dy, 4, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#e77b59"; ctx.beginPath(); ctx.arc(p.x + dx + sway - 1, p.y + dy - 1, 1.5, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "#647c4c"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x + dx + sway, p.y + dy - 4); ctx.lineTo(p.x + dx + sway + 1, p.y + dy - 6); ctx.stroke();
        });
      }
    }
    ctx.fillStyle = "rgba(236,236,177,.23)"; ctx.beginPath(); ctx.arc(p.x - 11 + sway, p.y - 51, 5, 0, Math.PI * 2); ctx.fill();
  }
  function drawHouse(building) {
    const p = project(building.x, building.y);
    ctx.fillStyle = "rgba(44,87,62,.22)"; ctx.beginPath(); ctx.ellipse(p.x + 2, p.y - 3, 42, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f3db9f"; ctx.beginPath(); ctx.moveTo(p.x - 31, p.y - 9); ctx.lineTo(p.x + 29, p.y - 9); ctx.lineTo(p.x + 29, p.y - 53); ctx.lineTo(p.x - 31, p.y - 53); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#d7b777"; ctx.beginPath(); ctx.moveTo(p.x + 14, p.y - 50); ctx.lineTo(p.x + 29, p.y - 53); ctx.lineTo(p.x + 29, p.y - 9); ctx.lineTo(p.x + 14, p.y - 9); ctx.closePath(); ctx.fill();
    const roof = ctx.createLinearGradient(p.x - 37, p.y - 77, p.x + 30, p.y - 43); roof.addColorStop(0, "#be7155"); roof.addColorStop(.5, "#d78b64"); roof.addColorStop(1, "#a95d4c");
    ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(p.x - 38, p.y - 51); ctx.lineTo(p.x - 3, p.y - 82); ctx.lineTo(p.x + 34, p.y - 54); ctx.lineTo(p.x + 25, p.y - 48); ctx.lineTo(p.x - 3, p.y - 70); ctx.lineTo(p.x - 31, p.y - 45); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255,208,155,.45)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x - 28, p.y - 54); ctx.lineTo(p.x - 3, p.y - 75); ctx.lineTo(p.x + 22, p.y - 55); ctx.stroke();
    ctx.fillStyle = "#7d5c47"; ctx.fillRect(p.x - 3, p.y - 35, 14, 26);
    ctx.fillStyle = "#a1c9bd"; ctx.fillRect(p.x - 23, p.y - 42, 11, 13); ctx.fillRect(p.x + 15, p.y - 42, 9, 13);
    ctx.strokeStyle = "#f7edc8"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x - 17, p.y - 42); ctx.lineTo(p.x - 17, p.y - 29); ctx.moveTo(p.x - 23, p.y - 35); ctx.lineTo(p.x - 12, p.y - 35); ctx.stroke();
    ctx.fillStyle = "#f4d892"; ctx.beginPath(); ctx.arc(p.x + 7, p.y - 21, 1.2, 0, Math.PI * 2); ctx.fill();
    if (state.homeLevel > 1) {
      ctx.fillStyle = "#f0d99f"; ctx.fillRect(p.x + 29, p.y - 36, 23, 29);
      ctx.fillStyle = "#c77d5d"; ctx.beginPath(); ctx.moveTo(p.x + 26, p.y - 35); ctx.lineTo(p.x + 39, p.y - 50); ctx.lineTo(p.x + 55, p.y - 35); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#a1c9bd"; ctx.fillRect(p.x + 36, p.y - 29, 9, 11);
      ctx.strokeStyle = "#f7edc8"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(p.x + 40.5, p.y - 29); ctx.lineTo(p.x + 40.5, p.y - 18); ctx.stroke();
    }
    drawBuildingSign(p.x - 3, p.y - 87, "PIP'S HOME");
  }
  function drawTent(building) {
    const p = project(building.x, building.y);
    ctx.fillStyle = "rgba(47,88,67,.19)"; ctx.beginPath(); ctx.ellipse(p.x + 3, p.y - 2, 46, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#eee1bb"; ctx.beginPath(); ctx.moveTo(p.x - 35, p.y - 7); ctx.lineTo(p.x - 32, p.y - 42); ctx.lineTo(p.x + 31, p.y - 42); ctx.lineTo(p.x + 35, p.y - 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#739c82"; ctx.beginPath(); ctx.moveTo(p.x - 39, p.y - 40); ctx.lineTo(p.x, p.y - 74); ctx.lineTo(p.x + 38, p.y - 40); ctx.lineTo(p.x + 30, p.y - 34); ctx.lineTo(p.x, p.y - 63); ctx.lineTo(p.x - 31, p.y - 34); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#567f6c"; ctx.beginPath(); ctx.moveTo(p.x - 35, p.y - 7); ctx.lineTo(p.x - 6, p.y - 42); ctx.lineTo(p.x + 6, p.y - 42); ctx.lineTo(p.x + 35, p.y - 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#f2e4c0"; ctx.beginPath(); ctx.moveTo(p.x - 20, p.y - 7); ctx.lineTo(p.x, p.y - 35); ctx.lineTo(p.x + 20, p.y - 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#d4b779"; ctx.fillRect(p.x - 27, p.y - 15, 54, 4);
    ctx.fillStyle = "#f2d993"; ctx.beginPath(); ctx.arc(p.x, p.y - 51, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#6e986e"; ctx.beginPath(); ctx.arc(p.x, p.y - 51, 4, 0, Math.PI * 2); ctx.fill();
    drawBuildingSign(p.x, p.y - 78, "RESIDENT SERVICES");
  }
  function drawShop(building) {
    const p = project(building.x, building.y);
    ctx.fillStyle = "rgba(44,87,62,.2)"; ctx.beginPath(); ctx.ellipse(p.x, p.y - 2, 38, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#dfd29e"; ctx.fillRect(p.x - 27, p.y - 44, 54, 38);
    ctx.fillStyle = "#bd8750"; ctx.beginPath(); ctx.moveTo(p.x - 33, p.y - 43); ctx.lineTo(p.x - 21, p.y - 61); ctx.lineTo(p.x + 21, p.y - 61); ctx.lineTo(p.x + 33, p.y - 43); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#e0a85f"; ctx.fillRect(p.x - 30, p.y - 45, 60, 6);
    ctx.fillStyle = "#ffedc4"; ctx.fillRect(p.x - 22, p.y - 37, 12, 12); ctx.fillRect(p.x + 10, p.y - 37, 12, 12);
    ctx.fillStyle = "#7d5e43"; ctx.fillRect(p.x - 4, p.y - 24, 10, 18);
    ctx.fillStyle = "#8b704c"; ctx.fillRect(p.x - 14, p.y - 50, 28, 6);
    drawBuildingSign(p.x, p.y - 67, "NOOK'S CRANNY");
  }
  function drawMuseum(building) {
    const p = project(building.x, building.y);
    ctx.fillStyle = "rgba(44,87,62,.18)"; ctx.beginPath(); ctx.ellipse(p.x, p.y - 1, 41, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e7dfbd"; ctx.fillRect(p.x - 30, p.y - 43, 60, 39);
    ctx.fillStyle = "#cec39f"; ctx.fillRect(p.x + 16, p.y - 43, 14, 39);
    ctx.fillStyle = "#79977a"; ctx.beginPath(); ctx.moveTo(p.x - 37, p.y - 43); ctx.lineTo(p.x - 26, p.y - 58); ctx.lineTo(p.x + 26, p.y - 58); ctx.lineTo(p.x + 37, p.y - 43); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#67866f"; ctx.beginPath(); ctx.moveTo(p.x - 38, p.y - 58); ctx.lineTo(p.x, p.y - 77); ctx.lineTo(p.x + 38, p.y - 58); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#dacb9d"; ctx.beginPath(); ctx.arc(p.x, p.y - 64, 6, Math.PI, Math.PI * 2); ctx.lineTo(p.x + 6, p.y - 58); ctx.lineTo(p.x - 6, p.y - 58); ctx.closePath(); ctx.fill();
    for (let col = -2; col <= 2; col += 1) {
      const x = p.x + col * 11;
      ctx.fillStyle = "#f8efd2"; ctx.fillRect(x - 2, p.y - 40, 5, 31);
      ctx.fillStyle = "#b5b18f"; ctx.fillRect(x - 3, p.y - 42, 7, 3); ctx.fillRect(x - 3, p.y - 9, 7, 3);
    }
    ctx.fillStyle = "#7d674b"; ctx.fillRect(p.x - 7, p.y - 27, 14, 23);
    ctx.fillStyle = "#f1e8c8"; ctx.beginPath(); ctx.arc(p.x, p.y - 76, 2.5, 0, Math.PI * 2); ctx.fill();
    drawBuildingSign(p.x, p.y - 87, "MOSSWHARF MUSEUM");
  }
  function drawCamp(building) {
    const p = project(building.x, building.y);
    ctx.fillStyle = "rgba(48,88,68,.18)"; ctx.beginPath(); ctx.ellipse(p.x, p.y - 1, 31, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ece0bd"; ctx.beginPath(); ctx.moveTo(p.x - 26, p.y - 5); ctx.lineTo(p.x - 22, p.y - 29); ctx.lineTo(p.x + 22, p.y - 29); ctx.lineTo(p.x + 26, p.y - 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#d77c5d"; ctx.beginPath(); ctx.moveTo(p.x - 30, p.y - 28); ctx.lineTo(p.x, p.y - 55); ctx.lineTo(p.x + 30, p.y - 28); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#9d6048"; ctx.beginPath(); ctx.moveTo(p.x - 23, p.y - 5); ctx.lineTo(p.x, p.y - 25); ctx.lineTo(p.x + 23, p.y - 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#f4dda2"; ctx.beginPath(); ctx.arc(p.x, p.y - 36, 4, 0, Math.PI * 2); ctx.fill();
  }
  function drawPier(building) {
    const p = project(building.x, building.y);
    ctx.strokeStyle = "#926b47"; ctx.lineCap = "round"; ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(p.x - 36, p.y - 34); ctx.lineTo(p.x + 26, p.y + 12); ctx.stroke();
    ctx.strokeStyle = "#c59864"; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(p.x - 36, p.y - 34); ctx.lineTo(p.x + 26, p.y + 12); ctx.stroke();
    ctx.strokeStyle = "#edce94"; ctx.lineWidth = 1.2;
    for (let i = -2; i <= 2; i += 1) { const x = p.x + i * 10; ctx.beginPath(); ctx.moveTo(x - 4, p.y - 35 + i * 7); ctx.lineTo(x + 4, p.y - 41 + i * 7); ctx.stroke(); }
  }
  function drawBuildingSign(x, y, label) {
    ctx.font = "900 6px Trebuchet MS"; const width = ctx.measureText(label).width + 12;
    ctx.fillStyle = "rgba(255,248,222,.92)"; roundRect(ctx, x - width / 2, y - 5, width, 13, 5); ctx.fill();
    ctx.fillStyle = "#657850"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(label, x, y + 1);
  }
  function roundRect(context, x, y, w, h, r) {
    context.beginPath(); context.moveTo(x + r, y); context.arcTo(x + w, y, x + w, y + h, r); context.arcTo(x + w, y + h, x, y + h, r); context.arcTo(x, y + h, x, y, r); context.arcTo(x, y, x + w, y, r); context.closePath();
  }

  function drawRock(rock, now) {
    const p = project(rock.x, rock.y);
    const hits = state.tappedRocks[rock.id] || 0;
    if (hits >= 3) return;
    ctx.fillStyle = "rgba(61,93,68,.18)"; ctx.beginPath(); ctx.ellipse(p.x, p.y - 1, 19, 6, 0, 0, Math.PI * 2); ctx.fill();
    const rockGrad = ctx.createLinearGradient(p.x - 12, p.y - 27, p.x + 11, p.y - 5);
    rockGrad.addColorStop(0, "#c2c4a5"); rockGrad.addColorStop(.42, "#989d82"); rockGrad.addColorStop(1, "#777f70");
    ctx.fillStyle = rockGrad; ctx.beginPath(); ctx.moveTo(p.x - 17, p.y - 5); ctx.lineTo(p.x - 14, p.y - 19); ctx.lineTo(p.x - 5, p.y - 27); ctx.lineTo(p.x + 8, p.y - 25); ctx.lineTo(p.x + 17, p.y - 14); ctx.lineTo(p.x + 14, p.y - 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(243,246,217,.5)"; ctx.beginPath(); ctx.ellipse(p.x - 5, p.y - 20, 5, 2.5, -.4, 0, Math.PI * 2); ctx.fill();
    if ((now / 400 | 0) % 3 === 0 && hits) { ctx.fillStyle = "#faf1bd"; ctx.font = "13px sans-serif"; ctx.fillText("✦", p.x + 15, p.y - 27); }
  }
  function drawFossil(fossil, now) {
    if (state.picked.includes(fossil.id)) return;
    const p = project(fossil.x, fossil.y);
    ctx.fillStyle = "#856345"; ctx.beginPath(); ctx.ellipse(p.x, p.y - 2, 8, 4, -.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e4cf9f"; ctx.save(); ctx.translate(p.x, p.y - 5); ctx.rotate(-.3); ctx.beginPath(); ctx.ellipse(0, 0, 7, 4.3, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(-1, -3, 2, 7); ctx.restore();
    if ((now / 650 | 0) % 3 === 0) { ctx.fillStyle = "rgba(255,247,211,.9)"; ctx.font = "11px sans-serif"; ctx.fillText("✦", p.x + 9, p.y - 11); }
  }
  function drawPickup(item, now) {
    const p = project(item.x, item.y);
    const bounce = Math.sin(now / 390 + item.x * 1.7) * 1.2;
    ctx.fillStyle = "rgba(55,89,61,.19)"; ctx.beginPath(); ctx.ellipse(p.x, p.y - 2, 9, 3.3, 0, 0, Math.PI * 2); ctx.fill();
    const icon = items[item.item]?.icon || "✦";
    ctx.font = `${item.item === "branch" ? 17 : 16}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(icon, p.x, p.y - 3 + bounce);
  }
  function drawFurniture(furniture, now) {
    const p = project(furniture.x, furniture.y);
    const flicker = Math.sin(now / 115 + furniture.x) * 1.4;
    const glow = ctx.createRadialGradient(p.x, p.y - 16, 1, p.x, p.y - 16, 34);
    glow.addColorStop(0, "rgba(255,198,101,.22)"); glow.addColorStop(1, "rgba(255,198,101,0)");
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(p.x, p.y - 16, 34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(55,76,52,.2)"; ctx.beginPath(); ctx.ellipse(p.x, p.y - 2, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#855b3e"; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(p.x - 9, p.y - 7); ctx.lineTo(p.x + 9, p.y - 1); ctx.moveTo(p.x - 8, p.y - 1); ctx.lineTo(p.x + 8, p.y - 8); ctx.stroke();
    for (let i = 0; i < 7; i += 1) {
      const angle = (i / 7) * Math.PI * 2;
      ctx.fillStyle = i % 2 ? "#9c9a77" : "#b2aa83";
      ctx.beginPath(); ctx.ellipse(p.x + Math.cos(angle) * 12, p.y - 4 + Math.sin(angle) * 5, 3.3, 2, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#e16f45"; ctx.beginPath(); ctx.moveTo(p.x, p.y - 6); ctx.bezierCurveTo(p.x - 11, p.y - 17 - flicker, p.x + 1, p.y - 26, p.x + 2, p.y - 18); ctx.bezierCurveTo(p.x + 13, p.y - 15, p.x + 7, p.y - 7, p.x, p.y - 6); ctx.fill();
    ctx.fillStyle = "#ffd56e"; ctx.beginPath(); ctx.moveTo(p.x + 1, p.y - 7); ctx.bezierCurveTo(p.x - 5, p.y - 14 - flicker, p.x + 4, p.y - 20, p.x + 4, p.y - 14); ctx.bezierCurveTo(p.x + 9, p.y - 12, p.x + 5, p.y - 8, p.x + 1, p.y - 7); ctx.fill();
  }
  function drawCharacterSprite(index, p, size, bob = 0) {
    if (!characterSheet.complete || !characterSheet.naturalWidth) return false;
    const cellW = characterSheet.naturalWidth / 2;
    const cellH = characterSheet.naturalHeight / 2;
    const sx = (index % 2) * cellW;
    const sy = Math.floor(index / 2) * cellH;
    ctx.drawImage(characterSheet, sx, sy, cellW, cellH, p.x - size / 2, p.y - size + bob, size, size);
    return true;
  }
  function drawAnimal(animal, now) {
    const bob = Math.sin(now / 340 + animal.x) * 1.5;
    const p = project(animal.x, animal.y);
    const characterIndex = { fox: 1, otter: 2, owl: 3 }[animal.kind];
    if (characterIndex !== undefined && drawCharacterSprite(characterIndex, p, dims.tileW * 1.48, bob)) return;
    ctx.fillStyle = "rgba(56,95,62,.18)"; ctx.beginPath(); ctx.ellipse(p.x, p.y - 1, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
    if (animal.kind === "owl") {
      ctx.fillStyle = "#927455"; ctx.beginPath(); ctx.ellipse(p.x, p.y - 16 - bob, 10, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(p.x - 7, p.y - 24 - bob); ctx.lineTo(p.x - 9, p.y - 33 - bob); ctx.lineTo(p.x - 1, p.y - 27 - bob); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(p.x + 7, p.y - 24 - bob); ctx.lineTo(p.x + 9, p.y - 33 - bob); ctx.lineTo(p.x + 1, p.y - 27 - bob); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#e8d9b0"; ctx.beginPath(); ctx.arc(p.x - 4, p.y - 23 - bob, 5, 0, Math.PI * 2); ctx.arc(p.x + 4, p.y - 23 - bob, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#d9a653"; ctx.beginPath(); ctx.arc(p.x - 4, p.y - 23 - bob, 2.4, 0, Math.PI * 2); ctx.arc(p.x + 4, p.y - 23 - bob, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#e7cd8e"; ctx.beginPath(); ctx.moveTo(p.x - 2.5, p.y - 19 - bob); ctx.lineTo(p.x + 2.5, p.y - 19 - bob); ctx.lineTo(p.x, p.y - 15 - bob); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#dfd5b3"; ctx.beginPath(); ctx.ellipse(p.x, p.y - 7 - bob, 8, 9, 0, 0, Math.PI * 2); ctx.fill();
    } else if (animal.kind === "fox") {
      ctx.fillStyle = "#e58a56"; ctx.beginPath(); ctx.ellipse(p.x, p.y - 17 - bob, 9, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(p.x - 8, p.y - 22 - bob); ctx.lineTo(p.x - 13, p.y - 35 - bob); ctx.lineTo(p.x - 3, p.y - 29 - bob); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(p.x + 8, p.y - 22 - bob); ctx.lineTo(p.x + 13, p.y - 35 - bob); ctx.lineTo(p.x + 3, p.y - 29 - bob); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#fff1d3"; ctx.beginPath(); ctx.ellipse(p.x, p.y - 13 - bob, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#4e5744"; ctx.beginPath(); ctx.arc(p.x - 3, p.y - 20 - bob, 1.1, 0, Math.PI * 2); ctx.arc(p.x + 3, p.y - 20 - bob, 1.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#54433c"; ctx.beginPath(); ctx.arc(p.x, p.y - 14 - bob, 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#759c7b"; ctx.beginPath(); ctx.ellipse(p.x, p.y - 6 - bob, 9, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#f1cf83"; ctx.beginPath(); ctx.ellipse(p.x - 4, p.y - 1, 2, 3, 0, 0, Math.PI * 2); ctx.ellipse(p.x + 4, p.y - 1, 2, 3, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = "#c58c64"; ctx.beginPath(); ctx.ellipse(p.x, p.y - 17 - bob, 9, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#9d6c4f"; ctx.beginPath(); ctx.arc(p.x - 8, p.y - 26 - bob, 4, 0, Math.PI * 2); ctx.arc(p.x + 8, p.y - 26 - bob, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#e7b28b"; ctx.beginPath(); ctx.ellipse(p.x, p.y - 21 - bob, 6, 6.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#415344"; ctx.beginPath(); ctx.arc(p.x - 2.5, p.y - 23 - bob, .9, 0, Math.PI * 2); ctx.arc(p.x + 2.5, p.y - 23 - bob, .9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#e5d39c"; ctx.beginPath(); ctx.ellipse(p.x, p.y - 8 - bob, 10, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#76987a"; ctx.fillRect(p.x - 5, p.y - 3, 10, 3);
    }
    ctx.fillStyle = "rgba(72,95,57,.22)"; ctx.beginPath(); ctx.arc(p.x - 10, p.y - 31 - bob, 3, 0, Math.PI * 2); ctx.fill();
  }
  function drawPlayer(now) {
    const p = project(state.player.x, state.player.y);
    const moving = keys.size > 0 || walkTarget;
    const bob = moving ? Math.abs(Math.sin(now / 74)) * 2.4 : Math.sin(now / 390) * 1;
    if (drawCharacterSprite(0, p, dims.tileW * 1.48, bob)) {
      ctx.strokeStyle = "#956844"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p.x + 13, p.y - 27 - bob); ctx.lineTo(p.x + 22, p.y - 43 - bob); ctx.stroke();
      if (state.selectedTool === "net") {
        ctx.strokeStyle = "rgba(250,249,224,.9)"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(p.x + 24, p.y - 47 - bob, 6, 8, -.6, 0, Math.PI * 2); ctx.stroke();
      } else if (state.selectedTool === "axe") {
        ctx.fillStyle = "#aeb7a1"; ctx.beginPath(); ctx.moveTo(p.x + 19, p.y - 43 - bob); ctx.lineTo(p.x + 28, p.y - 45 - bob); ctx.lineTo(p.x + 27, p.y - 38 - bob); ctx.lineTo(p.x + 20, p.y - 38 - bob); ctx.closePath(); ctx.fill();
      } else {
        ctx.strokeStyle = "#ede5c7"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(p.x + 24, p.y - 48 - bob, 4, 6, -.3, 0, Math.PI * 2); ctx.stroke();
      }
      return;
    }
    ctx.fillStyle = "rgba(50,92,59,.22)"; ctx.beginPath(); ctx.ellipse(p.x, p.y - 2, 12, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    // Backpack, legs and shirt give the little villager a familiar toy-like silhouette.
    ctx.fillStyle = "#bd7957"; roundRect(ctx, p.x - 10, p.y - 24 - bob, 6, 12, 2); ctx.fill();
    ctx.fillStyle = "#f1c581"; ctx.beginPath(); ctx.ellipse(p.x - 3, p.y - 9 - bob, 3.2, 5, -.1, 0, Math.PI * 2); ctx.ellipse(p.x + 4, p.y - 9 - bob, 3.2, 5, .1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#779e79"; ctx.beginPath(); ctx.ellipse(p.x, p.y - 19 - bob, 9, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#eac293"; ctx.beginPath(); ctx.ellipse(p.x - 9, p.y - 18 - bob, 3, 5, -.2, 0, Math.PI * 2); ctx.ellipse(p.x + 9, p.y - 18 - bob, 3, 5, .2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e9b489"; ctx.beginPath(); ctx.arc(p.x, p.y - 34 - bob, 8.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#684c3b"; ctx.beginPath(); ctx.arc(p.x, p.y - 37 - bob, 8.5, Math.PI, Math.PI * 2); ctx.lineTo(p.x + 8, p.y - 32 - bob); ctx.quadraticCurveTo(p.x, p.y - 35 - bob, p.x - 8, p.y - 31 - bob); ctx.closePath(); ctx.fill();
    if (state.facing !== "up") {
      ctx.fillStyle = "#435441"; ctx.beginPath(); ctx.arc(p.x - 2.5, p.y - 33 - bob, 1, 0, Math.PI * 2); ctx.arc(p.x + 2.5, p.y - 33 - bob, 1, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#ba6f60"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.x, p.y - 30 - bob, 2.2, .2, Math.PI - .2); ctx.stroke();
    }
    // Equipped tool follows the little player's hand.
    if (state.selectedTool === "net") {
      ctx.strokeStyle = "#956844"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x + 7, p.y - 18 - bob); ctx.lineTo(p.x + 15, p.y - 32 - bob); ctx.stroke();
      ctx.strokeStyle = "rgba(250,249,224,.7)"; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.ellipse(p.x + 16, p.y - 35 - bob, 6, 8, -.6, 0, Math.PI * 2); ctx.stroke();
    } else if (state.selectedTool === "axe") {
      ctx.strokeStyle = "#926642"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(p.x + 7, p.y - 17 - bob); ctx.lineTo(p.x + 15, p.y - 30 - bob); ctx.stroke();
      ctx.fillStyle = "#aeb7a1"; ctx.beginPath(); ctx.moveTo(p.x + 11, p.y - 30 - bob); ctx.lineTo(p.x + 20, p.y - 32 - bob); ctx.lineTo(p.x + 19, p.y - 25 - bob); ctx.lineTo(p.x + 12, p.y - 25 - bob); ctx.closePath(); ctx.fill();
    } else if (state.selectedTool === "shovel") {
      ctx.strokeStyle = "#8f6844"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(p.x + 7, p.y - 17 - bob); ctx.lineTo(p.x + 15, p.y - 32 - bob); ctx.stroke();
      ctx.fillStyle = "#9eaa99"; ctx.beginPath(); ctx.ellipse(p.x + 17, p.y - 35 - bob, 3, 5, .4, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeStyle = "#946b44"; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(p.x + 7, p.y - 18 - bob); ctx.lineTo(p.x + 17, p.y - 38 - bob); ctx.stroke();
      ctx.strokeStyle = "#ede5c7"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(p.x + 18, p.y - 39 - bob, 4, 6, -.3, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = "#efc976"; ctx.beginPath(); ctx.ellipse(p.x - 3, p.y - 5, 4, 2.4, 0, 0, Math.PI * 2); ctx.ellipse(p.x + 5, p.y - 5, 4, 2.4, 0, 0, Math.PI * 2); ctx.fill();
  }
  function drawBug(now) {
    if (Date.now() < bug.cooldown) return;
    const x = bug.x + Math.sin(now / 620) * .48;
    const y = bug.y + Math.cos(now / 720) * .32;
    const p = project(x, y, 13 + Math.sin(now / 130) * 3);
    const wing = Math.sin(now / 45) * 3;
    ctx.fillStyle = "rgba(255,245,225,.42)";
    ctx.beginPath(); ctx.ellipse(p.x - 3, p.y - 4, 4, 2 + Math.abs(wing), -.5, 0, Math.PI * 2); ctx.ellipse(p.x + 3, p.y - 4, 4, 2 + Math.abs(wing), .5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e39abb"; ctx.beginPath(); ctx.ellipse(p.x, p.y - 4, 2.5, 4, 0, 0, Math.PI * 2); ctx.fill();
  }
  function drawFishing(now) {
    const fishP = project(fishingSpot.x, fishingSpot.y);
    ctx.fillStyle = "rgba(59,130,145,.28)"; ctx.beginPath(); ctx.ellipse(fishP.x, fishP.y - 2, 8, 3, Math.sin(now / 700), 0, Math.PI * 2); ctx.fill();
    if (fishing) {
      const p = project(fishing.target.x, fishing.target.y);
      const player = project(state.player.x, state.player.y, 26);
      ctx.strokeStyle = "rgba(255,250,222,.9)"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(player.x + 8, player.y - 3); ctx.quadraticCurveTo((p.x + player.x) / 2 + 7, (p.y + player.y) / 2, p.x, p.y); ctx.stroke();
      const ring = 4 + (Math.sin(now / 180) + 1) * 2;
      ctx.strokeStyle = "rgba(244,255,230,.68)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(p.x, p.y, ring + 3, ring * .38, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = fishing.phase === "bite" ? "#ed755d" : "#f0d98c"; ctx.beginPath(); ctx.arc(p.x, p.y - 3, 4, 0, Math.PI * 2); ctx.fill();
    }
  }
  function drawScene(now) {
    drawTerrain(now);
    drawGroundDecor(now);
    const entities = [
      ...buildings,
      ...trees,
      ...rocks.filter((rock) => (state.tappedRocks[rock.id] || 0) < 3),
      ...fossils.filter((fossil) => !state.picked.includes(fossil.id)),
      ...groundObjects(),
      ...state.furniture,
      ...animals.map((animal) => ({ ...animal, type: "animal" })),
      { id: "player", type: "player", x: state.player.x, y: state.player.y },
    ];
    entities.sort((a, b) => (a.x + a.y) - (b.x + b.y));
    for (const entity of entities) {
      if (entity.type === "tree") drawTree(entity, now);
      else if (entity.type === "rock") drawRock(entity, now);
      else if (entity.type === "fossil") drawFossil(entity, now);
      else if (entity.type === "pickup") drawPickup(entity, now);
      else if (entity.type === "campfire") drawFurniture(entity, now);
      else if (entity.type === "animal") drawAnimal(entity, now);
      else if (entity.type === "home") drawHouse(entity);
      else if (entity.type === "services") drawTent(entity);
      else if (entity.type === "shop") drawShop(entity);
      else if (entity.type === "museum") drawMuseum(entity);
      else if (entity.type === "camp") drawCamp(entity);
      else if (entity.type === "pier") drawPier(entity);
      else if (entity.type === "player") drawPlayer(now);
    }
    drawBug(now);
    drawFishing(now);
    const hour = Math.floor((9 * 60 + 12 + Math.floor((now - stateTime) / 15000)) / 60) % 24;
    if (hour >= 19 || hour < 5) { ctx.fillStyle = "rgba(39,54,101,.19)"; ctx.fillRect(0, 0, dims.width, dims.height); }
    else if (hour < 8 || hour >= 17) { ctx.fillStyle = "rgba(255,174,99,.07)"; ctx.fillRect(0, 0, dims.width, dims.height); }
  }
  function drawMap(context, width, height, full = false) {
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#75c2ce"; context.fillRect(0, 0, width, height);
    const pad = full ? 26 : 7;
    const scaleX = (width - pad * 2) / 24;
    const scaleY = (height - pad * 2) / 18;
    const centerX = pad + 11.6 * scaleX;
    const centerY = pad + 8.6 * scaleY;
    context.fillStyle = "#e8d49a"; context.beginPath(); context.ellipse(centerX, centerY, 11.7 * scaleX, 8.45 * scaleY, 0, 0, Math.PI * 2); context.fill();
    context.fillStyle = "#8fbe70"; context.beginPath(); context.ellipse(centerX, centerY, 9.5 * scaleX, 6.8 * scaleY, 0, 0, Math.PI * 2); context.fill();
    context.strokeStyle = "#83ced5"; context.lineWidth = Math.max(3, scaleX * 1.25); context.lineCap = "round"; context.beginPath();
    for (let y = 2; y <= 16; y += .2) {
      const x = riverCenter(y); const sx = pad + x * scaleX; const sy = pad + y * scaleY;
      if (y === 2) context.moveTo(sx, sy); else context.lineTo(sx, sy);
    }
    context.stroke();
    const points = [[12.8, 7.5, "#e3a85b"], [17.2, 7.3, "#d57b5d"], [8.1, 10.5, "#cb765d"], [4.2, 11, "#dd8a63"], [5.2, 6.3, "#829b7b"]];
    for (const [x, y, color] of points) { context.fillStyle = color; context.beginPath(); context.arc(pad + x * scaleX, pad + y * scaleY, full ? 4 : 2.4, 0, Math.PI * 2); context.fill(); }
    context.fillStyle = "#fff8dc"; context.strokeStyle = "#64874f"; context.lineWidth = full ? 2.5 : 1.5;
    context.beginPath(); context.arc(pad + state.player.x * scaleX, pad + state.player.y * scaleY, full ? 4.5 : 3, 0, Math.PI * 2); context.fill(); context.stroke();
  }

  function move(dt) {
    let dx = 0; let dy = 0;
    if (keys.has("left")) dx -= 1;
    if (keys.has("right")) dx += 1;
    if (keys.has("up")) dy -= 1;
    if (keys.has("down")) dy += 1;
    if (!dx && !dy && walkTarget) {
      const vx = walkTarget.x - state.player.x; const vy = walkTarget.y - state.player.y;
      const distance = Math.hypot(vx, vy);
      if (distance < .13) { walkTarget = null; }
      else { dx = vx / distance; dy = vy / distance; }
    }
    if (!dx && !dy) return;
    if (keys.size) walkTarget = null;
    const length = Math.hypot(dx, dy); dx /= length; dy /= length;
    state.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down");
    const speed = 2.8 * dt;
    const nx = state.player.x + dx * speed;
    if (isWalkable(nx, state.player.y)) state.player.x = nx;
    const ny = state.player.y + dy * speed;
    if (isWalkable(state.player.x, ny)) state.player.y = ny;
    state.stats.steps += speed;
  }
  function nearestArray(arr, distanceLimit = 1.6) {
    let best = null;
    for (const item of arr) {
      const d = Math.hypot(state.player.x - item.x, state.player.y - item.y);
      if (d < distanceLimit && (!best || d < best.distance)) best = { item, distance: d };
    }
    return best;
  }
  function useTool() {
    if (fishing?.phase === "bite") { catchFish(); return; }
    if (fishing) { toast("Wait for a bite…"); return; }
    const tool = state.selectedTool;
    if (!state.tools[tool]) { toast(`Your ${tool} broke. Craft another in DIY Recipes.`); return; }
    if (tool === "rod") { castLine(); return; }
    if (tool === "net") { swingNet(); return; }
    if (tool === "axe") { chopTree(); return; }
    if (tool === "shovel") { digGround(); return; }
  }
  function useDurability(tool, amount = 1) {
    state.tools[tool] = Math.max(0, (state.tools[tool] || 0) - amount);
    if (!state.tools[tool]) toast(`Your ${tool} broke! Craft another with the DIY app.`);
    updateHud(); save();
  }
  function castLine() {
    if (!canFishNear()) { toast("Walk to the river, pond, or shoreline to fish."); return; }
    const target = nearestWaterPoint();
    fishing = { phase: "waiting", timer: 1.7 + Math.random() * 2, target };
    toast("You cast your line. Wait for a nibble…");
  }
  function nearestWaterPoint() {
    let best = null; let dist = Infinity;
    const px = state.player.x; const py = state.player.y;
    for (let x = Math.floor(px) - 3; x <= Math.ceil(px) + 3; x += .5) {
      for (let y = Math.floor(py) - 3; y <= Math.ceil(py) + 3; y += .5) {
        if (!isWater(x, y)) continue;
        const d = Math.hypot(px - x, py - y);
        if (d < dist) { best = { x, y }; dist = d; }
      }
    }
    return best || { x: fishingSpot.x, y: fishingSpot.y };
  }
  function catchFish() {
    fishing = null; $("fish-bite").hidden = true;
    const types = ["Sea bass", "Pale chub", "Crucian carp"];
    const caught = types[Math.floor(Math.random() * types.length)];
    if (addItem("fish", 1, `I caught a ${caught.toLowerCase()}!`)) {
      useDurability("rod");
      if (!state.notices.caught) { state.notices.caught = true; awardMiles(100, "Nook Miles+  ·  First catch!"); }
      updateHud(); save();
    }
  }
  function escapeFish() {
    fishing = null; $("fish-bite").hidden = true; toast("The fish got away. Try again when you see a nibble!");
  }
  function swingNet() {
    const now = Date.now();
    if (now < bug.cooldown) { toast("The butterflies are resting. Come back in a moment!"); return; }
    const movingBug = { x: bug.x + Math.sin(performance.now() / 620) * .48, y: bug.y + Math.cos(performance.now() / 720) * .32 };
    const dist = Math.hypot(state.player.x - movingBug.x, state.player.y - movingBug.y);
    if (dist < 1.85) {
      bug.cooldown = now + 9000;
      if (addItem("butterfly", 1, "I caught a common butterfly!")) {
        useDurability("net");
        if (!state.notices.caught) { state.notices.caught = true; awardMiles(100, "Nook Miles+  ·  It caught a bug!"); }
      }
    } else { toast("No bugs close by. Try the flowers or trees!"); }
  }
  function chopTree() {
    const near = nearestArray(trees, 1.85);
    if (!near) { toast("Stand close to a tree to chop some wood."); return; }
    if (bagCount() >= 20) { toast("Your pockets are full! Open your NookPhone to make room."); return; }
    const tree = near.item;
    state.choppedTrees[tree.id] = (state.choppedTrees[tree.id] || 0) + 1;
    useDurability("axe");
    const material = ["wood", "softwood", "hardwood"][Math.floor(Math.random() * 3)];
    addItem(material, 1, `Chop! Picked up ${items[material].name.toLowerCase()}.`);
    state.stats.chopped = (state.stats.chopped || 0) + 1;
    save();
  }
  function digGround() {
    const nearFossil = nearestArray(fossils.filter((f) => !state.picked.includes(f.id)), 1.75);
    if (nearFossil) {
      const fossil = nearFossil.item;
      if (bagCount() >= 20) { toast("Your pockets are full! Open your NookPhone to make room."); return; }
      state.picked.push(fossil.id);
      useDurability("shovel");
      if (addItem("fossil", 1, "A fossil! I should get this assessed.")) {
        state.stats.fossils += 1;
        awardMiles(100, "Nook Miles+  ·  Fossil finder!");
      }
      save(); return;
    }
    const nearRock = nearestArray(rocks.filter((r) => (state.tappedRocks[r.id] || 0) < 3), 1.8);
    if (nearRock) {
      const rock = nearRock.item;
      if (bagCount() >= 20) { toast("Your pockets are full! Open your NookPhone to make room."); return; }
      const hit = (state.tappedRocks[rock.id] || 0) + 1;
      state.tappedRocks[rock.id] = hit;
      useDurability("shovel");
      const material = ["stone", "clay", "iron"][Math.floor(Math.random() * 3)];
      addItem(material, 1, `Rock hit! Found ${items[material].name.toLowerCase()}.`);
      if (hit >= 3) toast("The rock has given all it can for now.");
      save(); return;
    }
    toast("No dig spot here. Look for a star-shaped mark in the grass.");
  }

  function interact() {
    const target = nearestTarget();
    if (!target) { toast("Nothing nearby to interact with."); return; }
    const object = target.object;
    if (object.type === "pickup") {
      if (addItem(object.item, 1, `Picked up ${items[object.item].name.toLowerCase()}.`)) {
        if (object.id.startsWith("fruit-")) state.fruitDrops = state.fruitDrops.filter((drop) => drop.id !== object.id);
        else state.picked.push(object.id);
        if (object.item === "shell" && !state.notices.shells) { state.notices.shells = true; awardMiles(100, "Nook Miles+  ·  Shell collector!"); }
        if (object.item === "apple" || object.item === "coconut") state.notices.fruit = true;
        save();
      }
      return;
    }
    if (object.type === "tree") { shakeTree(object); return; }
    if (object.type === "rock") { digGround(); return; }
    if (object.type === "fossil") { digGround(); return; }
    if (object.id === "services") { serviceDialogue(); return; }
    if (object.id === "shop") { shopDialogue(); return; }
    if (object.id === "home") { openPage("home"); return; }
    if (object.id === "juniper") { neighborDialogue(); return; }
    if (object.id === "tilly") { serviceDialogue(); return; }
    if (object.id === "museum" || object.id === "blathers") { museumDialogue(); return; }
    if (object.id === "timmy") { shopDialogue(); return; }
  }
  function shakeTree(tree) {
    if (Date.now() - (state.shakenTrees[tree.id] || 0) < 10000) { toast("This tree needs a little time to grow more fruit."); return; }
    state.shakenTrees[tree.id] = Date.now();
    const item = tree.kind === "palm" ? "coconut" : "apple";
    const offsets = [[-.2, .65], [.25, .8], [.55, .35]];
    for (let i = 0; i < 3; i += 1) state.fruitDrops.push({ id: `fruit-${tree.id}-${Date.now()}-${i}`, type: "pickup", item, x: tree.x + offsets[i][0], y: tree.y + offsets[i][1] });
    if (Math.random() < .55) state.fruitDrops.push({ id: `branch-${tree.id}-${Date.now()}`, type: "pickup", item: "branch", x: tree.x + .8, y: tree.y + .25 });
    save(); toast("The tree shook! Fruit fell to the ground.");
  }

  function talk(name, title, icon, text, options = []) {
    $("dialogue-name").innerHTML = `${name} <span>${title}</span>`;
    $("dialogue-portrait").textContent = icon;
    $("dialogue-text").textContent = text;
    const buttons = $("dialogue-options"); buttons.replaceChildren();
    for (const option of options) {
      const button = document.createElement("button"); button.textContent = option.label;
      button.addEventListener("click", () => option.action()); buttons.append(button);
    }
    $("dialogue-box").hidden = false;
    $("interaction-hint").hidden = true;
  }
  function closeDialogue() { $("dialogue-box").hidden = true; }
  function serviceDialogue() {
    const options = [
      { label: "Let's craft something", action: () => openPage("diy") },
      { label: "About my home loan…", action: () => openPage("home") },
      { label: "What should I do today?", action: () => talk("Tilly", "resident representative", "🦦", "Take a look around the island. There are fossils to dig up, fruit to shake from the trees, and a little neighbor waiting to say hello!") },
      { label: "I'm all set", action: closeDialogue },
    ];
    if (!state.loan) options.splice(2, 0, { label: `Plan a room addition · ${homeUpgradeCost().toLocaleString()} Bells`, action: () => openPage("home") });
    talk("Tilly", "resident representative", "🦦", "Welcome home! Resident Services is always here for island life support. How can I help?", options);
  }
  function museumDialogue() {
    const fossilsInPockets = state.inventory.fossil || 0;
    const welcome = fossilsInPockets
      ? `Oh my! You have ${fossilsInPockets} fossil${fossilsInPockets === 1 ? "" : "s"} with you. I would be delighted to add them to the museum collection.`
      : `Welcome to the Mosswharf Museum. If you find a fossil, bring it by and I will gladly add it to our collection. Do mind the dust!`;
    const options = fossilsInPockets ? [
      { label: `Donate ${fossilsInPockets} fossil${fossilsInPockets === 1 ? "" : "s"}`, action: () => {
        state.inventory.fossil = 0;
        state.donatedFossils += fossilsInPockets;
        updateHud(); save();
        if (state.donatedFossils === fossilsInPockets) awardMiles(300, "Nook Miles+  ·  A generous donation!");
        talk("Blathers", "museum curator", "🦉", `Thank you! The museum is a little richer for your kindness. That makes ${state.donatedFossils} fossil${state.donatedFossils === 1 ? "" : "s"} in the collection.`, [{ label: "Wonderful!", action: closeDialogue }]);
      } },
      { label: "Maybe later", action: closeDialogue },
    ] : [{ label: "I'll keep an eye out", action: closeDialogue }];
    talk("Blathers", "museum curator", "🦉", welcome, options);
  }
  function neighborDialogue() {
    const lines = ["The river sounds different every day. I could sit here and listen to it forever!", "I put a little surprise near the old cedar trees. See if you can find it!", "The fruit trees look so pretty this time of year. Want to shake one with me?", "I saw something fluttering near the flowers. Keep your net ready!", "I love this island. It feels like it gets a little more like home every day."];
    const line = lines[Math.floor(Math.random() * lines.length)];
    talk("Juniper", "your island neighbor", "🦊", line, [
      { label: "Let's explore together!", action: () => { closeDialogue(); toast("Juniper waves and heads off toward the plaza."); } },
      { label: "See you later", action: closeDialogue },
    ]);
  }
  function saleValue() { return Object.entries(state.inventory).reduce((sum, [id, n]) => sum + (items[id]?.price || 0) * n, 0); }
  function sellAll() {
    const total = saleValue();
    if (!total) { toast("There is nothing to sell right now."); return; }
    for (const id of Object.keys(state.inventory)) if (items[id]?.price) state.inventory[id] = 0;
    state.bells += total;
    state.stats.sales += total;
    updateHud(); save();
    if (state.stats.sales >= 1000 && !state.notices.sold) { state.notices.sold = true; awardMiles(200, "Nook Miles+  ·  Seller's market!"); }
    talk("Timmy", "Nook's Cranny", "🦝", `Thanks for bringing in all these island finds! Here's ${total.toLocaleString()} Bells for the bunch.`, [{ label: "Thanks!", action: closeDialogue }]);
  }
  function shopDialogue() {
    talk("Timmy", "Nook's Cranny", "🦝", "Welcome! We buy island finds, and we have a few useful things for sale, too.", [
      { label: `Sell pocket items (${saleValue().toLocaleString()} Bells)`, action: sellAll },
      { label: "Buy medicine · 400 Bells", action: () => { if (state.bells < 400) { toast("You need 400 Bells for medicine."); return; } if (bagCount() >= 20) { toast("Your pockets are full."); return; } state.bells -= 400; addItem("medicine", 1, "Medicine added to your pockets."); closeDialogue(); } },
      { label: "Never mind", action: closeDialogue },
    ]);
  }
  function payLoan(amount = 1000) {
    if (!state.loan) { toast("Visit Tilly at Resident Services to plan your next room."); return; }
    const payment = Math.min(state.loan, state.bells, amount);
    if (!payment) { toast("Save up some Bells and come back to pay your loan."); return; }
    state.bells -= payment; state.loan -= payment; updateHud(); save();
    if (!state.loan) toast("Home loan paid off! Your next room is ready when you are.");
    else toast(`Paid ${payment.toLocaleString()} Bells toward your home loan.`);
    openPage("home");
  }
  function upgradeHome() {
    if (state.loan > 0) { toast("Pay off your current home loan before adding another room."); return; }
    const cost = homeUpgradeCost();
    if (state.bells < cost) { toast(`Save ${cost.toLocaleString()} Bells to build your next room.`); return; }
    state.bells -= cost;
    state.homeLevel += 1;
    state.loan = cost;
    updateHud(); save(); openPage("home");
    toast(`Home level ${state.homeLevel}! Your new room is being built.`);
  }
  function openPhone() {
    const overlay = $("screen-overlay");
    if (!overlay.hidden) { closeOverlay(); return; }
    overlay.hidden = false; $("phone-panel").hidden = false; $("content-panel").hidden = true;
    closeDialogue();
  }
  function closeOverlay() {
    $("screen-overlay").hidden = true; $("phone-panel").hidden = true; $("content-panel").hidden = true;
    dialogueReturnPage = null;
  }
  function openPage(page) {
    closeDialogue();
    const overlay = $("screen-overlay"); overlay.hidden = false;
    $("phone-panel").hidden = true; $("content-panel").hidden = false;
    dialogueReturnPage = page;
    renderPage(page);
  }
  function renderInventory() {
    const entries = Object.keys(items).map((id) => {
      const count = state.inventory[id] || 0;
      if (id === "campfire" && count) return `<button type="button" class="pocket-item" title="Place simple campfire" aria-label="Place ${count} simple campfire" data-place="campfire"><span>${items[id].icon}</span><b>${count}</b></button>`;
      return `<div class="pocket-item${count ? "" : " empty"}" title="${items[id].name}">${count ? `<span>${items[id].icon}</span><b>${count}</b>` : ""}</div>`;
    });
    while (entries.length < 20) entries.push('<div class="pocket-item empty" aria-hidden="true"></div>');
    return `<h2>Pockets</h2><p class="subtitle">Everything you pick up travels with you. ${bagCount()} / 20 slots used.</p><div class="pocket-grid">${entries.join("")}</div>`;
  }
  function recipeReady(recipe) { return Object.entries(recipe.material).every(([id, n]) => (state.inventory[id] || 0) >= n); }
  function materialText(recipe) { return Object.entries(recipe.material).map(([id, n]) => `${items[id]?.icon || "✦"} ${n} ${items[id]?.name || id}`).join(" · "); }
  function renderRecipes() {
    const rows = recipes.map((recipe) => `<div class="recipe-row"><span class="recipe-icon">${recipe.icon}</span><span class="recipe-info"><b>${recipe.name}</b><small>${materialText(recipe)}</small></span><button class="recipe-button" data-craft="${recipe.id}" ${recipeReady(recipe) ? "" : "disabled"}>Craft</button></div>`).join("");
    return `<h2>DIY Recipes</h2><p class="subtitle">Make useful things from materials you gather around the island.</p><div class="recipe-list">${rows}</div>`;
  }
  function renderMiles() {
    const tasks = [
      ["✿", "Island life", "Take 500 steps around Mosswharf", Math.min(500, Math.floor(state.stats.steps)), 500, 100],
      ["🌱", "Fruit roots", "Shake fruit from the trees", Math.min(5, state.stats.fruit), 5, 100],
      ["🎣", "Cast master", "Catch fish along the river", Math.min(3, state.stats.fish), 3, 150],
      ["🦋", "Butterfly fan", "Catch bugs in the flower gardens", Math.min(3, state.stats.bugs), 3, 150],
    ];
    const rows = tasks.map(([icon, title, desc, current, goal, reward]) => `<div class="miles-stamp"><span>${icon}</span><div><b>${title}</b><small>${desc} · ${current}/${goal}</small></div><strong>+${reward}</strong></div>`).join("");
    return `<h2>Nook Miles+</h2><p class="subtitle">Miles make every little island adventure count. Balance: <b>${state.miles.toLocaleString()}</b></p>${rows}`;
  }
  function renderPassport() {
    const days = 4 + Math.floor(state.stats.steps / 500);
    return `<h2>Island Passport</h2><p class="subtitle">A little snapshot of your life on Mosswharf.</p><div class="passport"><h3>🐚 Pip</h3><p>Resident of <b>${state.islandName}</b><br>Moved in during early autumn<br>Favorite thing: making this island home</p><div class="passport-stats"><span><b>${days}</b>days here</span><span><b>${state.stats.fish}</b>fish caught</span><span><b>${state.stats.bugs}</b>bugs caught</span></div></div>`;
  }
  function renderHome() {
    const paid = state.loan === 0;
    const action = paid
      ? `<button class="loan-pay" data-do="upgrade">Build a home addition · ${homeUpgradeCost().toLocaleString()} Bells</button>`
      : `<button class="loan-pay" data-do="pay">Pay 1,000 Bells toward my loan</button>`;
    const description = paid
      ? `Your home is paid off. Expand to level ${state.homeLevel + 1} with a new room and a ${homeUpgradeCost().toLocaleString()} Bell loan.`
      : `Home level ${state.homeLevel}. Pay any amount toward the loan, then Tilly can arrange your next room.`;
    return `<h2>Home sweet home</h2><p class="subtitle">Your island home grows as you settle in.</p><div class="loan-card"><small class="hud-label">HOME LEVEL ${state.homeLevel} · ${paid ? "READY TO EXPAND" : "CURRENT LOAN"}</small><strong>${state.loan.toLocaleString()} Bells</strong><p>${description}</p><div class="loan-track"><b style="width:${Math.max(4, Math.min(100, ((loanPrincipal() - state.loan) / loanPrincipal()) * 100))}%"></b></div></div><div style="height:12px"></div>${action}`;
  }
  function renderPage(page) {
    const title = { pockets: "Pockets", diy: "DIY Recipes", miles: "Nook Miles+", passport: "Island Passport", map: "Island Map", home: "Home sweet home" }[page] || "NookPhone";
    const content = $("panel-content");
    if (page === "pockets") content.innerHTML = renderInventory();
    else if (page === "diy") content.innerHTML = renderRecipes();
    else if (page === "miles") content.innerHTML = renderMiles();
    else if (page === "passport") content.innerHTML = renderPassport();
    else if (page === "home") content.innerHTML = renderHome();
    else if (page === "map") content.innerHTML = `<h2>${state.islandName} map</h2><p class="subtitle">Your home, Resident Services, Nook's Cranny, the museum, and the river winding through the island.</p><canvas class="map-large" id="large-map" width="390" height="270"></canvas>`;
    $("phone-title").textContent = title;
    content.querySelectorAll("[data-craft]").forEach((button) => button.addEventListener("click", () => craft(button.dataset.craft)));
    content.querySelectorAll("[data-place]").forEach((button) => button.addEventListener("click", () => placeFurniture(button.dataset.place)));
    content.querySelectorAll("[data-do]").forEach((button) => button.addEventListener("click", () => {
      if (button.dataset.do === "sell") { closeOverlay(); shopDialogue(); }
      if (button.dataset.do === "pay") payLoan();
      if (button.dataset.do === "upgrade") upgradeHome();
    }));
    const map = $("large-map"); if (map) drawMap(map.getContext("2d"), map.width, map.height, true);
  }
  function craft(id) {
    const recipe = recipes.find((r) => r.id === id);
    if (!recipe || !recipeReady(recipe)) return;
    removeItems(recipe.material);
    if (recipe.tool) {
      state.tools[recipe.tool] = Math.min(30, (state.tools[recipe.tool] || 0) + recipe.uses);
      state.selectedTool = recipe.tool;
      toast(`${recipe.name} crafted and ready to use!`);
    } else if (recipe.item === "campfire") {
      addItem("campfire", 1, "Simple campfire crafted!");
    }
    state.stats.crafted += 1; state.miles += 50;
    updateHud(); save(); renderPage("diy");
  }
  function placeFurniture(type) {
    if (type !== "campfire" || !(state.inventory.campfire > 0)) return;
    const offset = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[state.facing] || [0, 1];
    const x = state.player.x + offset[0] * 1.15;
    const y = state.player.y + offset[1] * 1.15;
    if (!isWalkable(x, y)) { toast("There isn't a clear patch of ground there."); return; }
    state.inventory.campfire -= 1;
    state.furniture.push({ id: `furniture-${Date.now()}`, type, x, y });
    save(); closeOverlay(); toast("Campfire placed. Your island feels a little cozier.");
  }
  function toggleMap() {
    const visible = minimap.classList.toggle("visible");
    if (visible) { drawMap(miniCtx, minimap.width, minimap.height, true); toast("Press M again to tuck your map away."); }
  }

  function updateTime(now) {
    const totalMinutes = (9 * 60 + 12 + Math.floor((now - stateTime) / 15000)) % 1440;
    const hour24 = Math.floor(totalMinutes / 60);
    const hour = hour24 % 12 || 12;
    const minute = totalMinutes % 60;
    $("clock").textContent = `${hour}:${String(minute).padStart(2, "0")} ${hour24 < 12 ? "AM" : "PM"}`;
    const date = new Date();
    $("weekday").textContent = date.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
    const month = date.getMonth();
    const season = month >= 2 && month <= 4 ? "🌸" : month >= 5 && month <= 7 ? "☀️" : month >= 8 && month <= 10 ? "🍂" : "❄️";
    document.querySelector(".season-mark").textContent = season;
    const isNight = hour24 >= 19 || hour24 < 5;
    $("weather-icon").textContent = isNight ? "☾" : "☀";
    $("weather-label").textContent = isNight ? "Clear night" : "Clear skies";
  }
  function frame(now) {
    if (!lastFrame) lastFrame = now;
    const dt = Math.min((now - lastFrame) / 1000, .04);
    lastFrame = now;
    move(dt);
    if (fishing) {
      fishing.timer -= dt;
      if (fishing.phase === "waiting" && fishing.timer <= 0) {
        fishing.phase = "bite"; fishing.timer = 1.45; $("fish-bite").hidden = false;
      } else if (fishing.phase === "bite" && fishing.timer <= 0) escapeFish();
    }
    if (walkTarget && Math.hypot(walkTarget.x - state.player.x, walkTarget.y - state.player.y) < .14) walkTarget = null;
    drawScene(now);
    const near = nearestTarget(); interactionHint(near);
    drawMap(previewCtx, mapPreview.width, mapPreview.height, false);
    if (minimap.classList.contains("visible")) drawMap(miniCtx, minimap.width, minimap.height, true);
    updateTime(now);
    if (now - lastAutoSave > 5000) { save(); lastAutoSave = now; }
    requestAnimationFrame(frame);
  }

  function setDirection(key, active) {
    if (active && (!$("screen-overlay").hidden || dialogueVisible())) return;
    const dir = ({ ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right" })[key];
    if (!dir) return;
    if (active) { keys.add(dir); walkTarget = null; }
    else keys.delete(dir);
  }
  window.addEventListener("keydown", (event) => {
    const target = event.target;
    if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
    if (event.code === "Escape") { closeOverlay(); closeDialogue(); minimap.classList.remove("visible"); return; }
    if (!$("screen-overlay").hidden) {
      if (event.code === "Tab") { event.preventDefault(); closeOverlay(); }
      return;
    }
    if (dialogueVisible()) {
      if (["KeyE", "Space", "Enter"].includes(event.code)) { event.preventDefault(); closeDialogue(); }
      return;
    }
    setDirection(event.code, true);
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Tab"].includes(event.code)) event.preventDefault();
    if (event.repeat) return;
    if (event.code === "Space") useTool();
    if (event.code === "KeyE") interact();
    if (event.code === "Tab") openPhone();
    if (event.code === "KeyB") openPage("pockets");
    if (event.code === "KeyM") toggleMap();
    if (/^Digit[1-4]$/.test(event.code)) selectTool(["net", "rod", "axe", "shovel"][Number(event.code.slice(-1)) - 1]);
  });
  window.addEventListener("keyup", (event) => setDirection(event.code, false));
  window.addEventListener("blur", () => keys.clear());
  window.addEventListener("pagehide", persistNow);
  world.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || !$("screen-overlay").hidden || dialogueVisible()) return;
    const rect = world.getBoundingClientRect();
    const point = toGrid(event.clientX - rect.left, event.clientY - rect.top);
    const target = { x: Math.max(0, Math.min(W, point.x)), y: Math.max(0, Math.min(H, point.y)) };
    if (!isWalkable(target.x, target.y)) { toast("The river and cliffs make a lovely view from here."); return; }
    walkTarget = target; fishing = null; $("fish-bite").hidden = true;
  });
  document.querySelectorAll(".tool-slot").forEach((slot) => slot.addEventListener("click", () => selectTool(slot.dataset.tool)));
  $("use-tool").addEventListener("click", useTool);
  $("talk-button").addEventListener("click", interact);
  $("phone-button").addEventListener("click", openPhone);
  $("map-toggle").addEventListener("click", toggleMap);
  $("dialogue-close").addEventListener("click", closeDialogue);
  $("dismiss-note").addEventListener("click", () => $("start-note").classList.add("fade"));
  document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", closeOverlay));
  document.querySelectorAll(".phone-apps [data-page]").forEach((button) => button.addEventListener("click", () => openPage(button.dataset.page)));
  document.querySelectorAll(".dpad button").forEach((button) => {
    const code = { up: "ArrowUp", left: "ArrowLeft", down: "ArrowDown", right: "ArrowRight" }[button.dataset.move];
    const down = (event) => { event.preventDefault(); setDirection(code, true); button.classList.add("pressed"); try { button.setPointerCapture(event.pointerId); } catch (_) {} };
    const up = (event) => { event.preventDefault(); setDirection(code, false); button.classList.remove("pressed"); };
    button.addEventListener("pointerdown", down); button.addEventListener("pointerup", up); button.addEventListener("pointercancel", up); button.addEventListener("lostpointercapture", up);
  });
  window.addEventListener("resize", resize);

  resize();
  updateHud();
  drawMap(previewCtx, mapPreview.width, mapPreview.height, false);
  setTimeout(() => $("start-note").classList.add("fade"), 5000);
  requestAnimationFrame(frame);
})();
