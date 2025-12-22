import { useEffect, useMemo, useState } from 'react'
import {
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane, 
  Card,
  CardTitle,
} from 'reactstrap';
import { LIGHT_TYPES } from '../../../../../lib/Engine/Light/Light';
import { useEntitySelector } from '../EntitySelectorProvider/EntitySelectorProvider';
import { ColliderTypes }  from '../../../../../lib/Engine/models/Model';


import './Workspace.scss';

const Lights = [
  //{ type: LIGHT_TYPES.DIRECTIONAL, desc: 'Directional Light' },
  { type: LIGHT_TYPES.POINT_LIGHT, desc: 'Point Light' },
  //{ type: LIGHT_TYPES.SPOT_LIGHT, desc: 'Spot Light' },
];

const WORKSPACE_TAB = {
  MODELS: 'Models',
  LIGHTS: 'Lights',
  HIERARCHY: 'Hierarchy',
  SIMULATION: 'Simulation',
  TRIGGERS: 'Triggers',
}

const WorkspaceModels = ({ engine }) => {
  const { setSelectedEntity, setSelectedEntityOptions } = useEntitySelector();
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/models-list.json')
      .then(response => response.json())
      .then(data => {
        setModels(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Erreur lors du chargement des modèles:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className='p-3'>Chargement des modèles...</div>;
  }

  const handleClick = async (model) => { 
    if (!engine || !engine.scene) return;
    await engine.scene.addModel(
      model.modelPath,
      { x: engine.cameraPosition[0], y: engine.cameraPosition[1], z: engine.cameraPosition[2] },
      ColliderTypes.FIXED,
    );
    const entity = engine.scene.models[engine.scene.models.length -1];
    setSelectedEntity(entity);
    const newOptions = {};
    Object.keys(entity.getParams()).map((key) => {
      const value = entity[key];
      newOptions[key] = value;
    });
    setSelectedEntityOptions(newOptions);
  }

  return (
    <div className='Workspace_models-grid'>
      {models.map((model, index) => (
        <Card onClick={() => handleClick(model)} key={index} className='Workspace_model-item p-2 jutify-content-center align-items-center'>
          <CardTitle>
            {model.type}📦
          </CardTitle>
          {model.modelPath.split('/').pop()}
        </Card>
      ))}
    </div>
  )
}

const WorkspaceLights = ({ lights, engine }) => {

  const handleClick = (light) => {
    console.debug('Adding light of type:', light.type);
    if (!engine || !engine.scene) return;

    const defaultSpotLightData = {
      position: {x: engine.cameraPosition[0], y: engine.cameraPosition[1], z: engine.cameraPosition[2] - 5},
      ambient: { x: 0.05, y: 0.05, z: 0.05 },
      diffuse: { x: 0.8, y: 0.8, z: 0.2 },
      specular: { x: 1.0, y: 1.0, z: 1.0 },
      constant: 1.0,
      linear: 0.09,
      quadratic: 0.032,
    };
    engine.scene.addLight(light.type, defaultSpotLightData);
  }

  return (
    <div className='Workspace_models-grid'>
      {lights.map((light, index) => (
        <Card onClick={() => handleClick(light)} key={index} className='Workspace_model-item p-2 jutify-content-center align-items-center'>
          <CardTitle>
            {light.type}
          </CardTitle>
          💡
        </Card>
      ))}
    </div>
  )
}

const WorkspaceTriggers = ({ engine }) => {
  const { setSelectedEntity, setSelectedEntityOptions } = useEntitySelector();
 
  const handleClick = () => {
    console.debug('Adding trigger');
    if (!engine || !engine.scene) return;

    const defaultTriggerData = {
      position: {x: engine.cameraPosition[0], y: engine.cameraPosition[1], z: engine.cameraPosition[2]},
      scale: { x: 1, y: 1, z: 1 },
      id: 'my trigger',
      onTrigger: () => {
        console.log('triggered: my trigger');
      }
    };
    const trigger = engine.scene.addTrigger(defaultTriggerData.id, defaultTriggerData.position, defaultTriggerData.scale, defaultTriggerData.onTrigger);
    setSelectedEntity(trigger);
    const newOptions = {};
    Object.keys(trigger.getParams()).map((key) => {
      const value = trigger[key];
      newOptions[key] = value;
    });
    setSelectedEntityOptions(newOptions);
  }

  return (
    <div className='Workspace_models-grid'>
      <Card onClick={handleClick} className='Workspace_model-item p-2 jutify-content-center align-items-center'>
        <CardTitle>
          Add trigger
        </CardTitle>
      </Card>
    </div>
  )
}

const WorkspaceHierarchy = ({ engine }) => {
  const { setSelectedEntity, setSelectedEntityOptions, selectedEntity } = useEntitySelector();

  const sceneHierarchy = useMemo(() => {
    if (!engine || !engine.scene) return { lights: [], models: [], triggers: [] };
    const lights = engine.scene.lights;
    const models = engine.scene.models;
    const triggers = engine.scene.triggers;
    return { lights, models, triggers };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, selectedEntity]);
  //hack to refresh the value since engine.scene.lights/models are not reactive

  const handleClickItem = (entity) => {
    setSelectedEntity(entity);
    console.debug('Selected entity:', entity);

    const newOptions = {};
    Object.keys(entity.getParams()).map((key) => {
      const value = entity[key];
      newOptions[key] = value;
    });
    setSelectedEntityOptions(newOptions);
  }

  return (
    <div className='Workspace_models-grid'>
      {sceneHierarchy.lights.map((light, index) => (
        <Card style={{ border: selectedEntity?.id === light.id ? '3px solid #646cff' : 'none' }} onClick={() => handleClickItem(light)} key={index} className='Workspace_model-item p-2 jutify-content-center align-items-center'>
          <CardTitle>
            {light.type}
          </CardTitle>
          💡
        </Card>
      ))}
      {sceneHierarchy.models.map((model, index) => (
        <Card style={{ border: selectedEntity?.id === model.id ? '3px solid #646cff' : 'none' }} onClick={() => handleClickItem(model)} key={index} className='Workspace_model-item p-2 jutify-content-center align-items-center'>
          <CardTitle>
            {model.type}📦
          </CardTitle>
          {model.modelPath.split('/').pop()}
        </Card>
      ))}
      {sceneHierarchy.triggers.map((trigger, index) => (
        <Card style={{ border: selectedEntity?.id === trigger.id ? '3px solid #646cff' : 'none' }} onClick={() => handleClickItem(trigger)} key={index} className='Workspace_model-item p-2 jutify-content-center align-items-center'>
          <CardTitle>
            {trigger.type} 🎯
          </CardTitle>
          {trigger.id}
        </Card>
      ))}
    </div>
  )
}

const WorkspaceSimulation = ({ engine, setDrawDebugLines }) => {
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (engine) {
      setIsRunning(engine.isSimulationRunning);
    }
  }, [engine]);

  const handleToggleSimulation = () => {
    if (!engine) return;

    const newState = !isRunning;
    engine.isSimulationRunning = newState;
    setIsRunning(newState);
  };

  return (
    <div className='p-3'>
      <div className='d-flex flex-column gap-3'>
        <Card className='p-3'>
          <CardTitle>Contrôles de simulation</CardTitle>
          <div className='d-flex gap-2 mt-2'>
            <button
              className='btn btn-primary'
              onClick={handleToggleSimulation}
              disabled={!engine}
            >
              {isRunning ? 'Stop' : 'Start'}
            </button>
            <button
              className='btn btn-secondary'
              onMouseDown={() => {
                if (!engine) return;
                engine.isSimulationRunning = true;
              }}
              onMouseUp={() => {
                if (!engine) return;
                engine.isSimulationRunning = false;
              }}
              disabled={!engine || isRunning}
            >
              Step
            </button> <button
              className='btn btn-primary'
              onClick={() => setDrawDebugLines((prev) => !prev)}
              disabled={!engine}
            >
              Toggle debug lines
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export const Workspace = ({ engine, setDrawDebugLines }) => {
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
          <NavLink href="#" active={category === WORKSPACE_TAB.TRIGGERS} onClick={() => setCategory(WORKSPACE_TAB.TRIGGERS)}>
            Triggers
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink href="#" active={category === WORKSPACE_TAB.HIERARCHY} onClick={() => setCategory(WORKSPACE_TAB.HIERARCHY)}>
            Hierarchy
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink href="#" active={category === WORKSPACE_TAB.SIMULATION} onClick={() => setCategory(WORKSPACE_TAB.SIMULATION)}>
            Simulation
          </NavLink>
        </NavItem>
      </Nav>
      <TabContent activeTab={category} className='overflow-auto'>
        <TabPane tabId={WORKSPACE_TAB.MODELS}>
          <WorkspaceModels engine={engine}  />
        </TabPane>
        <TabPane tabId={WORKSPACE_TAB.LIGHTS}>
          <WorkspaceLights lights={Lights} engine={engine} />
        </TabPane>
        <TabPane tabId={WORKSPACE_TAB.HIERARCHY}>
          <WorkspaceHierarchy engine={engine} />
        </TabPane>
        <TabPane tabId={WORKSPACE_TAB.SIMULATION}>
          <WorkspaceSimulation engine={engine} setDrawDebugLines={setDrawDebugLines} />
        </TabPane>
        <TabPane tabId={WORKSPACE_TAB.TRIGGERS}>
          <WorkspaceTriggers engine={engine} />
        </TabPane>
      </TabContent>
    </div>
  )
}
