// components/Home/types.ts
import { ReactNode } from 'react';

export interface Stage {
    id: number;
    title: string;
    icon: ReactNode;
    color: string;
    content: string;
}

export type StageClickHandler = (stage: Stage) => void;
