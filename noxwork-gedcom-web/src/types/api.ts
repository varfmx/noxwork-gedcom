/* ─── Backend API Response Types ─────────────────────────────── */

export interface ApiDetectedRole {
    type: string;
    degree: number;
    kinshipPath: {
        path: string[];
        edges: string[];
    };
}

export interface ApiIndividual {
    id: string;
    givenName: string;
    surname: string;
    fullName: string;
    sex: 'M' | 'F' | 'U';
    birthDate: string | null;
    birthPlace: string | null;
    deathDate: string | null;
    deathPlace: string | null;
    familySpouseIds: string[];
    familyChildId: string | null;
    detectedRoles?: ApiDetectedRole[];
}

export interface ApiFamily {
    id: string;
    husbandId: string | null;
    wifeId: string | null;
    childrenIds: string[];
    marriageDate: string | null;
    marriagePlace: string | null;
}

export interface ApiMetadata {
    source: string | null;
    gedcomVersion: string | null;
    charset: string | null;
}

export interface UploadResponse {
    success: boolean;
    message: string;
    data: {
        sessionId: string;
        stats: {
            individualsCount: number;
            familiesCount: number;
        };
        individuals: ApiIndividual[];
        families: ApiFamily[];
        metadata: ApiMetadata;
    };
}

/* ─── React Flow Node Data ───────────────────────────────────── */

export interface PersonNodeData {
    [key: string]: unknown;
    label: string;
    fullName: string;
    givenName: string;
    surname: string;
    sex: 'M' | 'F' | 'U';
    birthDate: string | null;
    deathDate: string | null;
    birthPlace: string | null;
    detectedRoles: ApiDetectedRole[];
    gedcomId: string;
}
