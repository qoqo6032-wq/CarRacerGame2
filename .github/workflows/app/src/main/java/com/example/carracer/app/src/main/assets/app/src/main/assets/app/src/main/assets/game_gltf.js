(function(){
  const STORAGE_KEY = "carRacer_v2";
  const defaultData = { money:12000, level:1, xp:0, owned:["generic_car"], selected:"generic_car" };
  let player = Object.assign({}, defaultData, JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}"));
  function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(player)); updateUI(); }

  // Car list - look for .glb files in assets/models/
  const CARS = [
    { id:"generic_car", label:"City Coupe", price:0, file:"models/generic_car.glb" },
    { id:"bugatti", label:"(Premium) Bugatti", price:15000, file:"models/bugatti.glb" },
    { id:"lamborghini", label:"(Premium) Lamborghini", price:8000, file:"models/lamborghini.glb" },
    { id:"ferrari", label:"(Premium) Ferrari", price:7000, file:"models/ferrari.glb" },
    { id:"porsche", label:"(Premium) Porsche", price:6000, file:"models/porsche.glb" }
  ];

  // UI refs
  const titleScreen=document.getElementById('titleScreen'), playBtn=document.getElementById('playBtn'), garageBtn=document.getElementById('garageBtn'), menuScreen=document.getElementById('menuScreen'), carsList=document.getElementById('carsList'), backFromGarage=document.getElementById('backFromGarage'), moneyValue=document.getElementById('moneyValue'), levelValue=document.getElementById('levelValue'), moneyHUD=document.getElementById('moneyHUD'), levelHUD=document.getElementById('levelHUD'), hud=document.getElementById('hud'), pauseScreen=document.getElementById('pauseScreen'), resumeBtn=document.getElementById('resumeBtn'), exitToMenu=document.getElementById('exitToMenu'), speedElem=document.getElementById('speed');

  function updateUI(){ moneyValue.textContent=player.money; moneyHUD.textContent=player.money; levelValue.textContent=player.level; levelHUD.textContent=player.level; }

  function buildGarage(){
    carsList.innerHTML='';
    CARS.forEach(car=>{
      const owned = player.owned.includes(car.id);
      const div = document.createElement('div'); div.className='carCard';
      div.innerHTML=`<strong>${car.label}</strong><div>${owned? 'Owned' : 'Price: $'+car.price}</div>`;
      if(owned){
        const sel=document.createElement('button'); sel.textContent=(player.selected===car.id?'Selected':'Select'); sel.onclick=()=>{ player.selected=car.id; save(); renderCarSelection(); }; div.appendChild(sel);
      } else {
        const buy=document.createElement('button'); buy.textContent='Buy $'+car.price; buy.onclick=()=>{ if(player.money>=car.price){ player.money-=car.price; player.owned.push(car.id); player.selected=car.id; save(); alert(car.label+' purchased!'); } else alert('Not enough funds'); }; div.appendChild(buy);
      }
      carsList.appendChild(div);
    });
  }
  function renderCarSelection(){ buildGarage(); updateUI(); }

  playBtn.onclick=()=>{ titleScreen.classList.add('hidden'); hud.classList.remove('hidden'); startGame(); }
  garageBtn.onclick=()=>{ titleScreen.classList.add('hidden'); menuScreen.classList.remove('hidden'); renderCarSelection(); }
  backFromGarage.onclick=()=>{ menuScreen.classList.add('hidden'); titleScreen.classList.remove('hidden'); save(); }
  resumeBtn.onclick=()=>{ pauseScreen.classList.add('hidden'); resumeGame(); }
  exitToMenu.onclick=()=>{ pauseScreen.classList.add('hidden'); hud.classList.add('hidden'); titleScreen.classList.remove('hidden'); stopGame(); save(); }

  // Three.js scene
  const canvas = document.getElementById('glCanvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
  renderer.setPixelRatio(window.devicePixelRatio||1);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8fb9ff);
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 5000);
  camera.position.set(0,6,12);

  // Lights - improved for realism
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6); scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 1.2); dir.position.set(-30,50,20); dir.castShadow = true; dir.shadow.mapSize.width=2048; dir.shadow.mapSize.height=2048; scene.add(dir);

  // City street environment (simple blocks and buildings)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2000,2000), new THREE.MeshStandardMaterial({color:0x222225,roughness:1}));
  ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; scene.add(ground);

  // Road lines
  const road = new THREE.Mesh(new THREE.PlaneGeometry(2000,40), new THREE.MeshStandardMaterial({color:0x111113,roughness:1}));
  road.rotation.x = -Math.PI/2; road.position.y = 0.01; scene.add(road);
  const laneMark = new THREE.Mesh(new THREE.PlaneGeometry(2000,2), new THREE.MeshStandardMaterial({color:0xffffee}));
  laneMark.rotation.x = -Math.PI/2; laneMark.position.y=0.02; laneMark.position.z=0; scene.add(laneMark);

  // Simple city blocks
  const buildingMat = new THREE.MeshStandardMaterial({color:0x1c1f26, roughness:0.7, metalness:0.1});
  for(let i=-6;i<=6;i++){
    for(let j=0;j<3;j++){
      const h = 8 + Math.random()*40;
      const b = new THREE.Mesh(new THREE.BoxGeometry(12, h, 12), buildingMat);
      b.position.set(i*25, h/2, -100 - j*60 + (Math.random()-0.5)*10);
      b.castShadow=true; b.receiveShadow=true;
      scene.add(b);
    }
  }

  // GLTF Loader
  const loader = new THREE.GLTFLoader();
  let activeCar = null;
  function loadCarModel(carId){
    const carDef = CARS.find(c=>c.id===carId) || CARS[0];
    const path = carDef.file;
    return new Promise((res,rej)=>{
      loader.load(path, gltf=>{
        if(activeCar){ scene.remove(activeCar); activeCar.traverse(n=>{ if(n.geometry) n.geometry.dispose(); if(n.material) { if(Array.isArray(n.material)){ n.material.forEach(m=>m.dispose()); } else n.material.dispose(); } }); activeCar=null; }
        activeCar = gltf.scene;
        activeCar.traverse(n=>{ if(n.isMesh) { n.castShadow = true; n.receiveShadow = true; if(n.material && n.material.map) n.material.map.encoding = THREE.sRGBEncoding; }});
        activeCar.scale.set(1,1,1);
        activeCar.position.set(0,0,0);
        scene.add(activeCar);
        res(activeCar);
      }, undefined, err=>{ console.error('GLTF load error', err); rej(err); });
    });
  }

  // Placeholder generic car if models missing: create a stylized vehicle
  function createPlaceholderCar(){
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.6,0.6,5.0), new THREE.MeshStandardMaterial({color:0xff2200, metalness:0.6, roughness:0.2}));
    body.position.y = 0.7; g.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6,0.5,1.8), new THREE.MeshStandardMaterial({color:0x111111, metalness:0.1, roughness:0.05}));
    cabin.position.y = 1.1; cabin.position.z = -0.4; g.add(cabin);
    const mkWheel=(x,z)=>{ const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,0.35,16), new THREE.MeshStandardMaterial({color:0x080808})); w.rotation.z = Math.PI/2; w.position.set(x,0.45,z); g.add(w); };
    mkWheel(1.05,1.9); mkWheel(-1.05,1.9); mkWheel(1.05,-1.9); mkWheel(-1.05,-1.9);
    return g;
  }

  // Game variables
  let running=false, lastTime=0, speed=0, distance=0;
  const obstacles = [];
  for(let i=0;i<40;i++){
    const ob = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({color:0xffaa00}));
    ob.position.set((Math.random()-0.5)*40,0.5, -i*30 - 40);
    scene.add(ob); obstacles.push(ob);
  }

  function startGame(){
    const sel = player.selected || 'generic_car';
    // try to load model; if fails, use placeholder
    loadCarModel(sel).catch(()=>{ if(activeCar===null){ activeCar = createPlaceholderCar(); scene.add(activeCar); } });
    speed=0; distance=0; running=true; lastTime=performance.now(); requestAnimationFrame(loop);
  }
  function stopGame(){ running=false; }
  function resumeGame(){ running=true; lastTime=performance.now(); requestAnimationFrame(loop); }

  // Input
  const keys = {}; window.addEventListener('keydown', e=>keys[e.code]=true); window.addEventListener('keyup', e=>keys[e.code]=false);

  function setSpeedHUD(v){ speedElem.textContent = Math.round(v) + ' km/h'; }

  function addXP(amount){ player.xp += amount; const needed = player.level*100; if(player.xp>=needed){ player.xp -= needed; player.level++; player.money += 1000; alert('Level up! Reached '+player.level); } save(); }

  function loop(now){
    if(!running) return;
    const dt = Math.min(0.05, (now-lastTime)/1000); lastTime = now;
    // simple driving physics
    const preset = CARS.find(c=>c.id===player.selected) || CARS[0];
    if(keys['ArrowUp']||keys['KeyW']) speed +=  (preset.speed? (preset.speed/2.2) : 40) * dt;
    else speed -= 40*dt;
    if(keys['ArrowDown']||keys['KeyS']) speed -= (preset.speed? (preset.speed/3) : 30) * dt;
    speed = Math.max(0, Math.min((preset.speed||160), speed));
    if(activeCar) {
      if(keys['ArrowLeft']||keys['KeyA']) activeCar.rotation.y += 1.6*dt;
      if(keys['ArrowRight']||keys['KeyD']) activeCar.rotation.y -= 1.6*dt;
      const forward = new THREE.Vector3(0,0,-1).applyQuaternion(activeCar.quaternion);
      activeCar.position.add(forward.multiplyScalar(speed*dt*0.18));
      camera.position.lerp(new THREE.Vector3(activeCar.position.x, activeCar.position.y+6, activeCar.position.z+12), 0.08);
      camera.lookAt(activeCar.position.x, activeCar.position.y+1, activeCar.position.z);
    }
    // obstacles movement
    for(let i=0;i<obstacles.length;i++){
      const ob = obstacles[i];
      ob.position.z += speed*dt*0.18;
      if(ob.position.z > 80){ ob.position.z = -400 - Math.random()*800; ob.position.x = (Math.random()-0.5)*40; player.money += 5; addXP(8); }
    }
    setSpeedHUD(speed);
    moneyHUD.textContent = player.money;
    renderer.render(scene, camera);
    distance += speed*dt*0.02;
    if(distance > 1200){ player.money += Math.round(200 + player.level*30); addXP(120); distance = 0; save(); }
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', ()=>{ renderer.setSize(window.innerWidth, window.innerHeight, false); camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); });
  document.addEventListener('visibilitychange', ()=>{ if(document.hidden){ if(running){ pauseScreen.classList.remove('hidden'); running=false } } });

  updateUI(); renderCarSelection(); save();
  window._carRacer = { player, CARS, loadCarModel };
})();
