/* ─── User Profile ───────────────────────────────────────────── */

/**
 * Prisma User row returned by GET /api/users/me.
 * Mirrors the User model fields exposed by UsersController.
 */
export interface UserProfile {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    /** UI language preference stored in the Prisma DB: "en" | "es" */
    language: string;
}

/* ─── Project / Dashboard Types ─────────────────────────────── */

export interface ProjectSummary {
    id: string;
    name: string;
    description: string | null;
    nodeCount: number;
    edgeCount: number;
    createdAt: string;
    updatedAt: string;
}

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
    positionX?: number | null;
    positionY?: number | null;
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

/* ─── Project Detail (hydration) ─────────────────────────────── */

/**
 * Response shape returned by GET /api/projects/:id.
 * Contains the full project metadata plus reconstructed
 * individuals and families in the same shape as an upload response.
 */
export interface ProjectDetailResponse {
    success: boolean;
    data: {
        id: string;
        name: string;
        description: string | null;
        nodeCount: number;
        edgeCount: number;
        createdAt: string;
        updatedAt: string;
        individuals: ApiIndividual[];
        families: ApiFamily[];
    };
}

/**
 * Response shape returned by POST /api/projects/:id/upload.
 */
export interface ProjectUploadResponse {
    success: boolean;
    message: string;
    data: {
        id: string;
        name: string;
        description: string | null;
        nodeCount: number;
        edgeCount: number;
        createdAt: string;
        updatedAt: string;
        individuals: ApiIndividual[];
        families: ApiFamily[];
    };
}
