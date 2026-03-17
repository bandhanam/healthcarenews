import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './MoleculeVizPage.css';

const ELEMENT_COLORS = {
  1: 0xffffff, 6: 0x909090, 7: 0x3050f8, 8: 0xff0d0d,
  9: 0x90e050, 15: 0xff8000, 16: 0xffff30, 17: 0x1ff01f,
  35: 0xa62929, 53: 0x940094,
};
const ELEMENT_RADII = {
  1: 0.25, 6: 0.4, 7: 0.38, 8: 0.36,
  9: 0.32, 15: 0.44, 16: 0.44, 17: 0.4,
  35: 0.45, 53: 0.5,
};
const ELEMENT_SYMBOLS = {
  1: 'H', 6: 'C', 7: 'N', 8: 'O', 9: 'F',
  15: 'P', 16: 'S', 17: 'Cl', 35: 'Br', 53: 'I',
};

const QUICK_PICKS = [
  'aspirin', 'caffeine', 'ibuprofen', 'metformin',
  'penicillin', 'semaglutide', 'sildenafil', 'paclitaxel',
];

const PUBCHEM_BASE = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name';
const PROP_FIELDS = 'MolecularFormula,MolecularWeight,IUPACName,XLogP,TPSA,HBondDonorCount,HBondAcceptorCount,Complexity';

function buildMolecule(scene, data3d) {
  const compound = data3d.PC_Compounds[0];
  const conformer = compound.coords[0].conformers[0];
  const elements = compound.atoms.element;
  const xs = conformer.x;
  const ys = conformer.y;
  const zs = conformer.z;

  const group = new THREE.Group();
  const geometries = [];
  const materials = [];

  const center = new THREE.Vector3();
  for (let i = 0; i < xs.length; i++) {
    center.x += xs[i];
    center.y += ys[i];
    center.z += zs[i];
  }
  center.divideScalar(xs.length);

  for (let i = 0; i < xs.length; i++) {
    const el = elements[i];
    const radius = ELEMENT_RADII[el] || 0.35;
    const color = ELEMENT_COLORS[el] ?? 0xcccccc;
    const geo = new THREE.SphereGeometry(radius, 24, 24);
    const mat = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.1,
      roughness: 0.4,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(xs[i] - center.x, ys[i] - center.y, zs[i] - center.z);
    group.add(mesh);
    geometries.push(geo);
    materials.push(mat);
  }

  if (compound.bonds) {
    const aid1 = compound.bonds.aid1;
    const aid2 = compound.bonds.aid2;
    const bondOrders = compound.bonds.order || [];

    for (let b = 0; b < aid1.length; b++) {
      const i = aid1[b] - 1;
      const j = aid2[b] - 1;
      const order = bondOrders[b] || 1;

      const start = new THREE.Vector3(xs[i] - center.x, ys[i] - center.y, zs[i] - center.z);
      const end = new THREE.Vector3(xs[j] - center.x, ys[j] - center.y, zs[j] - center.z);

      const dir = new THREE.Vector3().subVectors(end, start);
      const length = dir.length();
      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      dir.normalize();

      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);

      const offsets = order === 1 ? [0] : order === 2 ? [-0.08, 0.08] : [-0.12, 0, 0.12];
      const perp = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(1, 0, 0));
      if (perp.length() < 0.01) perp.crossVectors(dir, new THREE.Vector3(0, 0, 1));
      perp.normalize();

      for (const off of offsets) {
        const cylGeo = new THREE.CylinderGeometry(0.06, 0.06, length, 8, 1);
        const cylMat = new THREE.MeshStandardMaterial({
          color: 0x666666,
          metalness: 0.1,
          roughness: 0.6,
        });
        const cylinder = new THREE.Mesh(cylGeo, cylMat);
        const offsetVec = perp.clone().multiplyScalar(off);
        cylinder.position.copy(mid).add(offsetVec);
        cylinder.quaternion.copy(quat);
        group.add(cylinder);
        geometries.push(cylGeo);
        materials.push(cylMat);
      }
    }
  }

  scene.add(group);
  return { group, geometries, materials };
}

function MoleculeVizPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [properties, setProperties] = useState(null);
  const [has3d, setHas3d] = useState(false);
  const [cid, setCid] = useState(null);
  const [searchedName, setSearchedName] = useState('');

  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const moleculeRef = useRef(null);
  const animFrameRef = useRef(null);

  const cleanupScene = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (moleculeRef.current) {
      const { group, geometries, materials } = moleculeRef.current;
      if (sceneRef.current) sceneRef.current.remove(group);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      moleculeRef.current = null;
    }
  }, []);

  const cleanupAll = useCallback(() => {
    cleanupScene();
    if (controlsRef.current) {
      controlsRef.current.dispose();
      controlsRef.current = null;
    }
    if (rendererRef.current) {
      rendererRef.current.dispose();
      rendererRef.current = null;
    }
    sceneRef.current = null;
    cameraRef.current = null;
  }, [cleanupScene]);

  useEffect(() => {
    return cleanupAll;
  }, [cleanupAll]);

  const initThree = useCallback(() => {
    if (!canvasRef.current || rendererRef.current) return;
    const container = canvasRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);

    const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 500);
    camera.position.set(0, 0, 15);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 3;
    controls.maxDistance = 60;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);
    const dirLight2 = new THREE.DirectionalLight(0x8888ff, 0.4);
    dirLight2.position.set(-5, -5, -5);
    scene.add(dirLight2);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;

    function animate() {
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    const handleResize = () => {
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);
    container._resizeHandler = handleResize;
  }, []);

  const search = useCallback(
    async (name) => {
      const drugName = (name || query).trim();
      if (!drugName) return;

      setLoading(true);
      setError('');
      setProperties(null);
      setHas3d(false);
      setCid(null);
      setSearchedName(drugName);
      cleanupScene();

      try {
        const encoded = encodeURIComponent(drugName);

        const [propsRes, record3dRes] = await Promise.allSettled([
          fetch(`${PUBCHEM_BASE}/${encoded}/property/${PROP_FIELDS}/JSON`),
          fetch(`${PUBCHEM_BASE}/${encoded}/record/JSON?record_type=3d`),
        ]);

        let propsData = null;
        if (propsRes.status === 'fulfilled' && propsRes.value.ok) {
          const json = await propsRes.value.json();
          propsData = json?.PropertyTable?.Properties?.[0] || null;
          if (propsData?.CID) setCid(propsData.CID);
        }

        if (!propsData) {
          const fallback = await fetch(`${PUBCHEM_BASE}/${encoded}/JSON`);
          if (fallback.ok) {
            const fj = await fallback.json();
            const compoundCid = fj?.PC_Compounds?.[0]?.id?.id?.cid;
            if (compoundCid) {
              setCid(compoundCid);
              const p2 = await fetch(
                `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${compoundCid}/property/${PROP_FIELDS}/JSON`
              );
              if (p2.ok) {
                const p2j = await p2.json();
                propsData = p2j?.PropertyTable?.Properties?.[0] || null;
              }
            }
          }
        }

        setProperties(propsData);

        let got3d = false;
        if (record3dRes.status === 'fulfilled' && record3dRes.value.ok) {
          const data3d = await record3dRes.value.json();
          const compound = data3d?.PC_Compounds?.[0];
          if (
            compound?.coords?.[0]?.conformers?.[0]?.x &&
            compound.atoms?.element
          ) {
            initThree();
            if (sceneRef.current) {
              moleculeRef.current = buildMolecule(sceneRef.current, data3d);

              const atoms = compound.atoms.element;
              let maxDist = 0;
              const conf = compound.coords[0].conformers[0];
              const cx = conf.x.reduce((a, b) => a + b, 0) / conf.x.length;
              const cy = conf.y.reduce((a, b) => a + b, 0) / conf.y.length;
              const cz = conf.z.reduce((a, b) => a + b, 0) / conf.z.length;
              for (let i = 0; i < atoms.length; i++) {
                const d = Math.sqrt(
                  (conf.x[i] - cx) ** 2 +
                  (conf.y[i] - cy) ** 2 +
                  (conf.z[i] - cz) ** 2
                );
                if (d > maxDist) maxDist = d;
              }
              const camDist = Math.max(maxDist * 2.8, 8);
              if (cameraRef.current) {
                cameraRef.current.position.set(0, 0, camDist);
                cameraRef.current.lookAt(0, 0, 0);
              }
              got3d = true;
            }
          }
        }

        setHas3d(got3d);

        if (!propsData && !got3d) {
          setError(`No data found for "${drugName}". Please check the spelling.`);
        }
      } catch (err) {
        setError(`Failed to fetch data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    },
    [query, cleanupScene, initThree],
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    search();
  };

  const handleQuickPick = (drug) => {
    setQuery(drug);
    search(drug);
  };

  const atomSummary = properties
    ? Object.entries(
        (properties.MolecularFormula || '').match(/[A-Z][a-z]?\d*/g)?.reduce((acc, part) => {
          const sym = part.match(/[A-Z][a-z]?/)?.[0];
          const count = parseInt(part.match(/\d+/)?.[0] || '1', 10);
          if (sym) acc[sym] = (acc[sym] || 0) + count;
          return acc;
        }, {}) || {},
      )
    : [];

  const imageUrl = searchedName
    ? `${PUBCHEM_BASE}/${encodeURIComponent(searchedName)}/PNG?image_size=400x400`
    : null;

  return (
    <div className="mv-page">
      <motion.div
        className="mv-hero"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="mv-title">MoleculeViz</h1>
        <p className="mv-subtitle">
          Interactive 3D molecule viewer powered by PubChem — search any drug to explore
          its atomic structure, bonds, and chemical properties.
        </p>
      </motion.div>

      <motion.div
        className="mv-search-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <form className="mv-search-form" onSubmit={handleSubmit}>
          <div className="mv-input-wrap">
            <svg className="mv-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="mv-search-input"
              placeholder="Enter a drug or compound name (e.g., aspirin, caffeine)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
          </div>
          <button type="submit" className="mv-search-btn" disabled={loading || !query.trim()}>
            {loading ? 'Searching...' : 'Visualize'}
          </button>
        </form>

        <div className="mv-quick-picks">
          <span className="mv-picks-label">Popular:</span>
          {QUICK_PICKS.map((drug) => (
            <button
              key={drug}
              className={`mv-pick-btn ${searchedName.toLowerCase() === drug ? 'active' : ''}`}
              onClick={() => handleQuickPick(drug)}
            >
              {drug}
            </button>
          ))}
        </div>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div
            className="mv-error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {loading && (
        <motion.div
          className="mv-loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="mv-spinner" />
          <span>Fetching molecular data from PubChem...</span>
        </motion.div>
      )}

      <AnimatePresence>
        {(has3d || properties) && !loading && (
          <motion.div
            className="mv-viewer-layout"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.4 }}
          >
            <div className="mv-viewer-panel">
              <div className="mv-viewer-header">
                <h2>{searchedName}</h2>
                {has3d && <span className="mv-badge-3d">3D Interactive</span>}
                {!has3d && <span className="mv-badge-2d">2D Structure</span>}
              </div>

              {has3d ? (
                <div className="mv-canvas-container" ref={canvasRef} />
              ) : (
                <div className="mv-fallback-2d">
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt={`2D structure of ${searchedName}`}
                      className="mv-2d-image"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                  <p className="mv-fallback-note">
                    3D conformer data not available for this compound. Showing 2D structure.
                  </p>
                </div>
              )}

              {has3d && (
                <div className="mv-controls-hint">
                  Drag to rotate · Scroll to zoom · Right-click to pan
                </div>
              )}
            </div>

            {properties && (
              <div className="mv-info-panel">
                <h3 className="mv-info-title">Compound Info</h3>

                {imageUrl && (
                  <div className="mv-info-image-wrap">
                    <img
                      src={imageUrl}
                      alt={`Structure of ${searchedName}`}
                      className="mv-info-image"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}

                <div className="mv-info-grid">
                  {properties.IUPACName && (
                    <div className="mv-info-row">
                      <span className="mv-info-label">IUPAC Name</span>
                      <span className="mv-info-value mv-iupac">{properties.IUPACName}</span>
                    </div>
                  )}
                  {properties.MolecularFormula && (
                    <div className="mv-info-row">
                      <span className="mv-info-label">Formula</span>
                      <span className="mv-info-value mv-formula">{properties.MolecularFormula}</span>
                    </div>
                  )}
                  {properties.MolecularWeight && (
                    <div className="mv-info-row">
                      <span className="mv-info-label">Molecular Weight</span>
                      <span className="mv-info-value">{properties.MolecularWeight} g/mol</span>
                    </div>
                  )}
                  {cid && (
                    <div className="mv-info-row">
                      <span className="mv-info-label">PubChem CID</span>
                      <a
                        className="mv-info-value mv-link"
                        href={`https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {cid}
                      </a>
                    </div>
                  )}
                  {properties.XLogP != null && (
                    <div className="mv-info-row">
                      <span className="mv-info-label">XLogP</span>
                      <span className="mv-info-value">{properties.XLogP}</span>
                    </div>
                  )}
                  {properties.TPSA != null && (
                    <div className="mv-info-row">
                      <span className="mv-info-label">TPSA</span>
                      <span className="mv-info-value">{properties.TPSA} A²</span>
                    </div>
                  )}
                  {properties.HBondDonorCount != null && (
                    <div className="mv-info-row">
                      <span className="mv-info-label">H-Bond Donors</span>
                      <span className="mv-info-value">{properties.HBondDonorCount}</span>
                    </div>
                  )}
                  {properties.HBondAcceptorCount != null && (
                    <div className="mv-info-row">
                      <span className="mv-info-label">H-Bond Acceptors</span>
                      <span className="mv-info-value">{properties.HBondAcceptorCount}</span>
                    </div>
                  )}
                  {properties.Complexity != null && (
                    <div className="mv-info-row">
                      <span className="mv-info-label">Complexity</span>
                      <span className="mv-info-value">{Math.round(properties.Complexity)}</span>
                    </div>
                  )}
                </div>

                {atomSummary.length > 0 && (
                  <div className="mv-atom-summary">
                    <h4>Atom Composition</h4>
                    <div className="mv-atom-chips">
                      {atomSummary.map(([sym, count]) => (
                        <span key={sym} className="mv-atom-chip">
                          {sym}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {has3d && (
                  <div className="mv-legend">
                    <h4>Element Colors</h4>
                    <div className="mv-legend-items">
                      {Object.entries(ELEMENT_SYMBOLS).map(([num, sym]) => (
                        <span key={num} className="mv-legend-item">
                          <span
                            className="mv-legend-dot"
                            style={{ background: `#${(ELEMENT_COLORS[num] || 0xcccccc).toString(16).padStart(6, '0')}` }}
                          />
                          {sym}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && !properties && !error && !searchedName && (
        <motion.div
          className="mv-empty-state"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="mv-empty-icon">⚛</div>
          <h3>Search for a drug or compound</h3>
          <p>Enter any drug name above or click a popular compound to visualize its 3D molecular structure.</p>
        </motion.div>
      )}
    </div>
  );
}

export default MoleculeVizPage;
