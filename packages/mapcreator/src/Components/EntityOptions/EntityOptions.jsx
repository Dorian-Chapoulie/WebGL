import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { Button } from 'reactstrap';
import { useEntitySelector } from '../EntitySelectorProvider/EntitySelectorProvider';

import './EntityOptions.scss';

const Vector3Input = ({ label, value, onChange, param, onMouseLeave }) => {
  const [isRatioEnabled, setIsRatioEnabled] = useState(param.ratio || false);
	
  const handleChange = (axis, newValue) => {
    if (isRatioEnabled) {
      const updatedValue = {
        x: parseFloat(newValue) || 0,
        y: parseFloat(newValue) || 0,
        z: parseFloat(newValue) || 0,
      };
      onChange(updatedValue);
      return;
    }
    const updatedValue = { ...value, [axis]: parseFloat(newValue) || 0 };
    onChange(updatedValue);
  };

  return (
    <div className="vector3-input" onMouseLeave={onMouseLeave}>
      <label>{label}</label>
      <div className="inputs">
        <div className="slider-group">
          <label>X</label>
          <input
            type="range"
            value={value.x}
            onChange={(e) => handleChange('x', e.target.value)}
            min={param.min}
            max={param.max}
            step={param.step || parseFloat(param.max - param.min) / 100}
            autoComplete='off'
            data-form-type="other"
          />
          <span className="value">{value.x.toFixed(2)}</span>
        </div>
        <div className="slider-group">
          <label>Y</label>
          <input
            type="range"
            value={value.y}
            onChange={(e) => handleChange('y', e.target.value)}
            min={param.min}
            max={param.max}
            step={param.step || parseFloat(param.max - param.min) / 100}
            autoComplete='off'
            data-form-type="other"
          />
          <span className="value">{value.y.toFixed(2)}</span>
        </div>
        <div className="slider-group">
          <label>Z</label>
          <input
            type="range"
            value={value.z}
            onChange={(e) => handleChange('z', e.target.value)}
            min={param.min}
            max={param.max}
            step={param.step || parseFloat(param.max - param.min) / 100}
            autoComplete='off'
            data-form-type="other"
          />
          <span className="value">{value.z.toFixed(2)}</span>
        </div>
        {param.ratio && (
          <div className="slider-group">
            <label>Ratio</label>
            <input
              type="checkbox"
              checked={isRatioEnabled}
              onChange={(e) => setIsRatioEnabled(e.target.checked)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

Vector3Input.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number,
    z: PropTypes.number,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  param: PropTypes.shape({
    min: PropTypes.number,
    max: PropTypes.number,
  }).isRequired,
};

const FloatInput = ({ label, value, onChange, param }) => {
  return (
    <div className="vector3-input">
      <label>{label}</label>
      <div className="inputs">
        <div className="slider-group">
          <input
            type="range"
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            min={param.min}
            max={param.max}
            step={param.step || parseFloat(param.max - param.min) / 100}
            autoComplete='off'
            data-form-type="other"
          />
          <span className="value">{value.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

FloatInput.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  param: PropTypes.shape({
    min: PropTypes.number,
    max: PropTypes.number,
  }).isRequired,
};

const StringInput = ({ label, value, onChange }) => {
  return (
    <div className="vector3-input d-flex align-items-center gap-3">
      <label>{label}</label>
      <div className="inputs">
        <div className="slider-group">
          <input
            type="text"
            checked={value}
            onChange={(e) => onChange(e.target.value)}
            value={value}
            autoComplete='off'
            data-form-type="other"
          />
        </div>
      </div>
    </div>
  );
};

StringInput.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
};

const SelectInput = ({ label, value, onChange, param }) => {
  return (
    <div className="vector3-input d-flex align-items-center gap-3">
      <label>{label}</label>
      <div className="inputs">
        <div className="slider-group">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoComplete='off'
            data-form-type="other"
          >
            {param.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

SelectInput.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  param: PropTypes.shape({
    options: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
};




export const EntityOptions = ({ engine }) => {
  const { selectedEntity, setSelectedEntity, selectedEntityOptions, setSelectedEntityOptions } = useEntitySelector();

  const handleDelete = () => {
    if (selectedEntity) {
      engine.scene.deleteEntity(selectedEntity.id);
      setSelectedEntityOptions(null);
      setSelectedEntity(null);
    }
  };
    
  return (    
    <div className='EntityOptions overflow-auto'>   
      <h1>{selectedEntity?.subtype} - {selectedEntity?.type}</h1>
      {selectedEntityOptions && selectedEntity && Object.keys(selectedEntity.getParams()).map((key) => {
        const params = selectedEntity.getParams();
        const currentParam = params[key];
        switch(currentParam.type) {
        case 'vector3':
          return (
            <Vector3Input 
              key={key}
              label={key} 
              value={selectedEntityOptions[key]} 
              param={currentParam}
              onChange={(newValue) => {
                params[key].onChange(engine.world, newValue)
                setSelectedEntityOptions({ ...selectedEntityOptions, [key]: newValue });
              }} 
            />
          );
        case 'float':
          return (
            <FloatInput 
              key={key}
              label={key} 
              value={selectedEntityOptions[key]} 
              param={currentParam}
              onChange={(newValue) => {
                params[key].onChange(engine.world, newValue)
                setSelectedEntityOptions({ ...selectedEntityOptions, [key]: newValue });
              }} 
            />
          );
        case 'string':
          return (
            <StringInput
              key={key}
              label={key}
              value={selectedEntityOptions[key]}
              param={currentParam}
              onChange={(newValue) => {
                params[key].onChange(engine.world, newValue)
                setSelectedEntityOptions({ ...selectedEntityOptions, [key]: newValue });
              }}
            />
          );
        case 'select':
          return (
            <SelectInput
              key={key}
              label={key}
              value={selectedEntityOptions[key]}
              param={currentParam}
              onChange={(newValue) => {
                params[key].onChange(engine.world, newValue)
                setSelectedEntityOptions({ ...selectedEntityOptions, [key]: newValue });
              }}
            />
          );
        default:
          return null;
        }
      })}
      {selectedEntityOptions && selectedEntity && (
        <Button color="danger" onClick={handleDelete} className="mt-3">
          Delete
        </Button>
      )}
    </div>
  )
}
