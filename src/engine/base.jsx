import { useEffect } from "react";
import { Engine } from "./Engine";


let engine = null;

export const EngineTest = () => {
    useEffect(() => {
        if (!engine) {
            engine = new Engine("glCanvas");
        }

        const render = (currentTime) => {
            engine.drawScene(currentTime);
            requestAnimationFrame(render);
        };
        
        requestAnimationFrame(render);

        return () => {
            cancelAnimationFrame(render);
        }
    }, []);

    return (
        <canvas id="glCanvas" width="640" height="480"></canvas>
    )
}