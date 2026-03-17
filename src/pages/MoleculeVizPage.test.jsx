import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import MoleculeVizPage from './MoleculeVizPage';

function pick(props) {
  const out = {};
  for (const [k, v] of Object.entries(props)) {
    if (['className', 'style', 'id', 'role', 'onClick', 'disabled', 'type', 'value', 'onChange', 'onSubmit', 'placeholder', 'autoComplete', 'href', 'target', 'rel', 'src', 'alt'].includes(k)) out[k] = v;
  }
  return out;
}

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }) => <div {...pick(p)}>{children}</div>,
    button: ({ children, ...p }) => <button {...pick(p)}>{children}</button>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

vi.mock('three', () => {
  const Vec3 = class { constructor() { this.x = 0; this.y = 0; this.z = 0; } set() { return this; } copy() { return this; } add() { return this; } clone() { return this; } divideScalar() { return this; } addVectors() { return this; } subVectors() { return this; } multiplyScalar() { return this; } crossVectors() { return this; } normalize() { return this; } length() { return 1; } };
  const Quat = class { setFromUnitVectors() { return this; } copy() { return this; } };
  const Group = class { add() {} };
  const Mesh = class { constructor() { this.position = new Vec3(); this.quaternion = new Quat(); } };
  const Geo = class { dispose() {} };
  const Mat = class { dispose() {} };
  return {
    Scene: class { constructor() { this.background = null; } add() {} remove() {} },
    PerspectiveCamera: class { constructor() { this.position = new Vec3(); this.aspect = 1; } updateProjectionMatrix() {} lookAt() {} },
    WebGLRenderer: class { constructor() { this.domElement = document.createElement('canvas'); } setSize() {} setPixelRatio() {} render() {} dispose() {} },
    Color: class {},
    Vector3: Vec3,
    Quaternion: Quat,
    Group,
    Mesh,
    SphereGeometry: Geo,
    CylinderGeometry: Geo,
    MeshStandardMaterial: Mat,
    AmbientLight: class { constructor() { this.position = new Vec3(); } },
    DirectionalLight: class { constructor() { this.position = new Vec3(); } },
  };
});

vi.mock('three/addons/controls/OrbitControls.js', () => ({
  OrbitControls: class {
    constructor() { this.enableDamping = false; this.dampingFactor = 0; this.minDistance = 0; this.maxDistance = 0; }
    update() {}
    dispose() {}
  },
}));

beforeEach(() => { vi.restoreAllMocks(); });

describe('MoleculeVizPage', () => {
  it('renders the page title', () => {
    render(<MoleculeVizPage />);
    expect(screen.getByText('MoleculeViz')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<MoleculeVizPage />);
    expect(screen.getByText(/Interactive 3D molecule viewer/)).toBeInTheDocument();
  });

  it('renders the search input', () => {
    render(<MoleculeVizPage />);
    expect(screen.getByPlaceholderText(/Enter a drug or compound name/)).toBeInTheDocument();
  });

  it('renders the Visualize button', () => {
    render(<MoleculeVizPage />);
    expect(screen.getByText('Visualize')).toBeInTheDocument();
  });

  it('renders all quick-pick buttons', () => {
    render(<MoleculeVizPage />);
    expect(screen.getByText('aspirin')).toBeInTheDocument();
    expect(screen.getByText('caffeine')).toBeInTheDocument();
    expect(screen.getByText('ibuprofen')).toBeInTheDocument();
    expect(screen.getByText('metformin')).toBeInTheDocument();
    expect(screen.getByText('penicillin')).toBeInTheDocument();
    expect(screen.getByText('semaglutide')).toBeInTheDocument();
    expect(screen.getByText('sildenafil')).toBeInTheDocument();
    expect(screen.getByText('paclitaxel')).toBeInTheDocument();
  });

  it('renders the empty state message', () => {
    render(<MoleculeVizPage />);
    expect(screen.getByText('Search for a drug or compound')).toBeInTheDocument();
  });

  it('disables Visualize button when input is empty', () => {
    render(<MoleculeVizPage />);
    const btn = screen.getByText('Visualize');
    expect(btn).toBeDisabled();
  });
});
