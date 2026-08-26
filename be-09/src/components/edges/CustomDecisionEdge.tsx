import React from 'react';
import { BaseEdge, EdgeLabelRenderer, EdgeProps, getSmoothStepPath } from '@xyflow/react';

export const CustomDecisionEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  sourceHandleId,
  data,
  animated,
}) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });

  const isYes = sourceHandleId === 'yes' || label === 'YES' || data?.decision === 'YES';
  const isNo = sourceHandleId === 'no' || label === 'NO' || data?.decision === 'NO';

  let strokeColor = '#64748b'; // default slate-500
  let labelBg = 'bg-slate-800 text-slate-300 border-slate-700';

  if (isYes) {
    strokeColor = '#10b981'; // emerald-500
    labelBg = 'bg-emerald-950 text-emerald-300 border-emerald-500/50 shadow-emerald-500/20';
  } else if (isNo) {
    strokeColor = '#f43f5e'; // rose-500
    labelBg = 'bg-rose-950 text-rose-300 border-rose-500/50 shadow-rose-500/20';
  }

  const customStyle = {
    ...style,
    stroke: strokeColor,
    strokeWidth: animated ? 3.5 : 2.5,
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={customStyle}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className={`px-2 py-0.5 rounded-full border text-[10px] font-extrabold tracking-wider shadow-md backdrop-blur-sm transition-all duration-300 ${labelBg} ${
              animated ? 'scale-110 ring-2 ring-emerald-400/50 animate-bounce' : ''
            }`}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};
