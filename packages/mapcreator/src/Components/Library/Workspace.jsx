import { useState } from 'react'
import {
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane, 
  Row,
  Col,
  Card,
  CardTitle,
  CardText,
  Button,
} from 'reactstrap';
import { LIGHT_TYPES } from '../../../../../lib/Engine/Light/Light';

import './Workspace.scss';

const models = [
  { name: 'Cube', path: '/models/Cube.gltf' },
  { name: 'Scene', path: '/models/Gltf/scene.gltf' },
  { name: 'Untitled', path: '/models/Untitled.gltf' },
  { name: 'Lion', path: '/models/test/low_poly_lion.gltf' },
  { name: 'Women', path: '/models/women/Untitled.gltf' },
  { name: 'Cube', path: '/models/Cube.gltf' },
  { name: 'Scene', path: '/models/Gltf/scene.gltf' },
  { name: 'Untitled', path: '/models/Untitled.gltf' },
  { name: 'Lion', path: '/models/test/low_poly_lion.gltf' },
  { name: 'Women', path: '/models/women/Untitled.gltf' },
  { name: 'Cube', path: '/models/Cube.gltf' },
  { name: 'Scene', path: '/models/Gltf/scene.gltf' },
  { name: 'Untitled', path: '/models/Untitled.gltf' },
  { name: 'Lion', path: '/models/test/low_poly_lion.gltf' },
  { name: 'Women', path: '/models/women/Untitled.gltf' },
  { name: 'Cube', path: '/models/Cube.gltf' },
  { name: 'Scene', path: '/models/Gltf/scene.gltf' },
  { name: 'Untitled', path: '/models/Untitled.gltf' },
  { name: 'Lion', path: '/models/test/low_poly_lion.gltf' },
  { name: 'Women', path: '/models/women/Untitled.gltf' },
  { name: 'Cube', path: '/models/Cube.gltf' },
  { name: 'Scene', path: '/models/Gltf/scene.gltf' },
  { name: 'Untitled', path: '/models/Untitled.gltf' },
  { name: 'Lion', path: '/models/test/low_poly_lion.gltf' },
  { name: 'Women', path: '/models/women/Untitled.gltf' },
];

const Lights = [
  //{ name: LIGHT_TYPES.DIRECTIONAL, desc: 'Directional Light' },
  { name: LIGHT_TYPES.POINT_LIGHT, desc: 'Point Light' },
  { name: LIGHT_TYPES.SPOT_LIGHT, desc: 'Spot Light' },
];

const WORKSPACE_TAB = {
  MODELS: 'Models',
  LIGHTS: 'Lights',
  HIERARCHY: 'Hierarchy',
}

const WorkspaceModels = () => {
  return (
    <div className='Workspace_models-grid'>
      {models.map((model, index) => (
        <Card key={index} className='Workspace_model-item p-2 jutify-content-center align-items-center'>
          <CardTitle>
            {model.name}
          </CardTitle>
          📦
        </Card>
      ))}
    </div>
  )
}

const WorkspaceLights = () => {
  return (
    <div className='Workspace_models-grid'>
      {Lights.map((model, index) => (
        <Card key={index} className='Workspace_model-item p-2 jutify-content-center align-items-center'>
          <CardTitle>
            {model.desc}
          </CardTitle>
          💡
        </Card>
      ))}
    </div>
  )
}

const WorkspaceHierarchy = () => {
  return (
    <div className='Workspace_models-grid'>
      {/* {Lights.map((model, index) => (
        <Card key={index} className='Workspace_model-item p-2 jutify-content-center align-items-center'>
          <CardTitle>
            {model.desc}
          </CardTitle>
          💡
        </Card>
      ))} */}
    </div>
  )
}

export const Workspace = ({ models, lights }) => {
  const [category, setCategory] = useState(WORKSPACE_TAB.MODELS);

  return (    
    <div className="Workspace">
      <Nav tabs className='border-0'>
        <NavItem>
          <NavLink href="#" active={category === WORKSPACE_TAB.MODELS} onClick={() => setCategory(WORKSPACE_TAB.MODELS)}>
            Models
          </NavLink>  
        </NavItem>
        <NavItem>
          <NavLink href="#" active={category === WORKSPACE_TAB.LIGHTS} onClick={() => setCategory(WORKSPACE_TAB.LIGHTS)}>
            Lights
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink href="#" active={category === WORKSPACE_TAB.HIERARCHY} onClick={() => setCategory(WORKSPACE_TAB.HIERARCHY)}>
            Hierarchy
          </NavLink>
        </NavItem>
      </Nav>
      <TabContent activeTab={category} className='overflow-auto'>
        <TabPane tabId={WORKSPACE_TAB.MODELS}>
          <WorkspaceModels />
        </TabPane>
        <TabPane tabId={WORKSPACE_TAB.LIGHTS}>
          <WorkspaceLights />
        </TabPane>
        <TabPane tabId={WORKSPACE_TAB.HIERARCHY}>
          <WorkspaceHierarchy models={models} lights={lights} />
        </TabPane>
      </TabContent>
    </div>
  )
}
