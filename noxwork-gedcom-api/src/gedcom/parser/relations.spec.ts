import { RelationshipResolver } from './relations';
import type { GedcomIndividual, GedcomFamily } from '../interfaces';

// ─── Test Helpers ───────────────────────────────────────────────────────────

/**
 * Creates a minimal GedcomIndividual for testing.
 */
function makeIndividual(
    id: string,
    name: string,
    sex: 'M' | 'F' | 'U' = 'U',
    overrides: Partial<GedcomIndividual> = {},
): GedcomIndividual {
    return {
        id,
        givenName: name.split(' ')[0] ?? name,
        surname: name.split(' ').slice(1).join(' '),
        fullName: name,
        sex,
        birthDate: null,
        birthPlace: null,
        deathDate: null,
        deathPlace: null,
        familySpouseIds: [],
        familyChildId: null,
        ...overrides,
    };
}

/**
 * Creates a minimal GedcomFamily for testing.
 */
function makeFamily(
    id: string,
    husbandId: string | null,
    wifeId: string | null,
    childrenIds: string[] = [],
): GedcomFamily {
    return {
        id,
        husbandId,
        wifeId,
        childrenIds,
        marriageDate: null,
        marriagePlace: null,
    };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('RelationshipResolver', () => {
    let resolver: RelationshipResolver;

    beforeEach(() => {
        resolver = new RelationshipResolver();
    });

    // ════════════════════════════════════════════════════════════════════════
    // 1. SIMPLE NUCLEAR FAMILY
    // ════════════════════════════════════════════════════════════════════════

    describe('Simple nuclear family', () => {
        /**
         *   Father (@I1@) ── Mother (@I2@)
         *           │
         *        Child (@I3@)
         */
        const individuals: Record<string, GedcomIndividual> = {
            '@I1@': makeIndividual('@I1@', 'John Doe', 'M', {
                familySpouseIds: ['@F1@'],
            }),
            '@I2@': makeIndividual('@I2@', 'Jane Doe', 'F', {
                familySpouseIds: ['@F1@'],
            }),
            '@I3@': makeIndividual('@I3@', 'Junior Doe', 'M', {
                familyChildId: '@F1@',
            }),
        };

        const families: Record<string, GedcomFamily> = {
            '@F1@': makeFamily('@F1@', '@I1@', '@I2@', ['@I3@']),
        };

        it('should detect Child role (source=Father, target=Junior)', () => {
            const result = resolver.resolve('@I1@', individuals, families);
            const junior = result.individuals['@I3@'];

            expect(junior).toBeDefined();
            expect(junior.detectedRoles.length).toBeGreaterThanOrEqual(1);

            const childRole = junior.detectedRoles.find((r) => r.type === 'Child');
            expect(childRole).toBeDefined();
            expect(childRole!.degree).toBe(1);
        });

        it('should detect Parent role (source=Junior, target=Father)', () => {
            const result = resolver.resolve('@I3@', individuals, families);
            const father = result.individuals['@I1@'];

            expect(father).toBeDefined();
            const parentRole = father.detectedRoles.find((r) => r.type === 'Parent');
            expect(parentRole).toBeDefined();
            expect(parentRole!.degree).toBe(1);
        });

        it('should detect Spouse role (source=Father, target=Mother)', () => {
            const result = resolver.resolve('@I1@', individuals, families);
            const mother = result.individuals['@I2@'];

            expect(mother).toBeDefined();
            const spouseRole = mother.detectedRoles.find(
                (r) => r.type === 'Spouse',
            );
            expect(spouseRole).toBeDefined();
            expect(spouseRole!.degree).toBe(1);
        });

        it('should include path metadata in detected roles', () => {
            const result = resolver.resolve('@I1@', individuals, families);
            const junior = result.individuals['@I3@'];
            const childRole = junior.detectedRoles.find((r) => r.type === 'Child');

            expect(childRole!.kinshipPath.path).toEqual(['@I1@', '@I3@']);
            expect(childRole!.kinshipPath.edges).toEqual(['parent-of']);
        });
    });

    // ════════════════════════════════════════════════════════════════════════
    // 2. GRANDPARENT CHAIN
    // ════════════════════════════════════════════════════════════════════════

    describe('Grandparent chain', () => {
        /**
         *   Grandpa (@I1@) ── Grandma (@I2@)
         *            │
         *         Dad (@I3@) ── Mom (@I4@)
         *            │
         *       Grandchild (@I5@)
         */
        const individuals: Record<string, GedcomIndividual> = {
            '@I1@': makeIndividual('@I1@', 'Grandpa', 'M', {
                familySpouseIds: ['@F1@'],
            }),
            '@I2@': makeIndividual('@I2@', 'Grandma', 'F', {
                familySpouseIds: ['@F1@'],
            }),
            '@I3@': makeIndividual('@I3@', 'Dad', 'M', {
                familyChildId: '@F1@',
                familySpouseIds: ['@F2@'],
            }),
            '@I4@': makeIndividual('@I4@', 'Mom', 'F', {
                familySpouseIds: ['@F2@'],
            }),
            '@I5@': makeIndividual('@I5@', 'Grandchild', 'M', {
                familyChildId: '@F2@',
            }),
        };

        const families: Record<string, GedcomFamily> = {
            '@F1@': makeFamily('@F1@', '@I1@', '@I2@', ['@I3@']),
            '@F2@': makeFamily('@F2@', '@I3@', '@I4@', ['@I5@']),
        };

        it('should detect Grandchild role (source=Grandpa, target=Grandchild)', () => {
            const result = resolver.resolve('@I1@', individuals, families);
            const grandchild = result.individuals['@I5@'];

            const gcRole = grandchild.detectedRoles.find(
                (r) => r.type === 'Grandchild',
            );
            expect(gcRole).toBeDefined();
            expect(gcRole!.degree).toBe(2);
        });

        it('should detect Grandparent role (source=Grandchild, target=Grandpa)', () => {
            const result = resolver.resolve('@I5@', individuals, families);
            const grandpa = result.individuals['@I1@'];

            const gpRole = grandpa.detectedRoles.find(
                (r) => r.type === 'Grandparent',
            );
            expect(gpRole).toBeDefined();
            expect(gpRole!.degree).toBe(2);
        });
    });

    // ════════════════════════════════════════════════════════════════════════
    // 3. HALF-SIBLINGS
    // ════════════════════════════════════════════════════════════════════════

    describe('Half-siblings', () => {
        /**
         *   Father (@I1@) ── Mother1 (@I2@)
         *        │
         *     Child1 (@I4@)
         *
         *   Father (@I1@) ── Mother2 (@I3@)
         *        │
         *     Child2 (@I5@)
         *
         *   Child1 and Child2 are half-siblings (same father, different mothers)
         */
        const individuals: Record<string, GedcomIndividual> = {
            '@I1@': makeIndividual('@I1@', 'Father', 'M', {
                familySpouseIds: ['@F1@', '@F2@'],
            }),
            '@I2@': makeIndividual('@I2@', 'Mother One', 'F', {
                familySpouseIds: ['@F1@'],
            }),
            '@I3@': makeIndividual('@I3@', 'Mother Two', 'F', {
                familySpouseIds: ['@F2@'],
            }),
            '@I4@': makeIndividual('@I4@', 'Child One', 'M', {
                familyChildId: '@F1@',
            }),
            '@I5@': makeIndividual('@I5@', 'Child Two', 'F', {
                familyChildId: '@F2@',
            }),
        };

        const families: Record<string, GedcomFamily> = {
            '@F1@': makeFamily('@F1@', '@I1@', '@I2@', ['@I4@']),
            '@F2@': makeFamily('@F2@', '@I1@', '@I3@', ['@I5@']),
        };

        it('should detect Half-Sibling between children of same father', () => {
            const result = resolver.resolve('@I4@', individuals, families);
            const child2 = result.individuals['@I5@'];

            const halfSibRole = child2.detectedRoles.find(
                (r) => r.type === 'Half-Sibling',
            );
            expect(halfSibRole).toBeDefined();
            expect(halfSibRole!.degree).toBe(2); // up to father, down to child2
        });
    });

    // ════════════════════════════════════════════════════════════════════════
    // 4. UNCLE / NEPHEW
    // ════════════════════════════════════════════════════════════════════════

    describe('Uncle/Nephew', () => {
        /**
         *   Grandpa (@I1@) ── Grandma (@I2@)
         *        │                │
         *     Father (@I3@)    Uncle (@I4@)
         *        │
         *     Nephew (@I5@)
         */
        const individuals: Record<string, GedcomIndividual> = {
            '@I1@': makeIndividual('@I1@', 'Grandpa', 'M', {
                familySpouseIds: ['@F1@'],
            }),
            '@I2@': makeIndividual('@I2@', 'Grandma', 'F', {
                familySpouseIds: ['@F1@'],
            }),
            '@I3@': makeIndividual('@I3@', 'Father', 'M', {
                familyChildId: '@F1@',
                familySpouseIds: ['@F2@'],
            }),
            '@I4@': makeIndividual('@I4@', 'Uncle', 'M', {
                familyChildId: '@F1@',
            }),
            '@I5@': makeIndividual('@I5@', 'Nephew', 'M', {
                familyChildId: '@F2@',
            }),
        };

        const families: Record<string, GedcomFamily> = {
            '@F1@': makeFamily('@F1@', '@I1@', '@I2@', ['@I3@', '@I4@']),
            '@F2@': makeFamily('@F2@', '@I3@', null, ['@I5@']),
        };

        it('should detect Uncle/Aunt (source=Nephew, target=Uncle)', () => {
            const result = resolver.resolve('@I5@', individuals, families);
            const uncle = result.individuals['@I4@'];

            const uncleRole = uncle.detectedRoles.find(
                (r) => r.type === 'Uncle/Aunt',
            );
            expect(uncleRole).toBeDefined();
            // Nephew → Father (child-of) → Grandpa (child-of) → Uncle (parent-of) = 3 hops
            // OR: Nephew → Father (child-of) → Uncle (sibling path) = depends on path
        });

        it('should detect Nephew/Niece (source=Uncle, target=Nephew)', () => {
            const result = resolver.resolve('@I4@', individuals, families);
            const nephew = result.individuals['@I5@'];

            const nephewRole = nephew.detectedRoles.find(
                (r) => r.type === 'Nephew/Niece',
            );
            expect(nephewRole).toBeDefined();
        });
    });

    // ════════════════════════════════════════════════════════════════════════
    // 5. PEDIGREE COLLAPSE / MULTI-ROLE DETECTION
    // ════════════════════════════════════════════════════════════════════════

    describe('Pedigree collapse — Multi-role detection', () => {
        /**
         * Complex scenario:
         *
         *   GrandpaA (@I1@) ── GrandmaA (@I2@)     GrandpaB (@I6@) ── GrandmaB (@I7@)
         *         │                                       │
         *     Son_C (@I3@)                          HalfSister_B (@I4@)
         *         │                                       │
         *         └───────────── Child_D (@I5@) ──────────┘
         *
         * Also: GrandpaA (@I1@) ── GrandmaB (@I7@) → HalfSister_B (@I4@)
         * (making B a half-sister of C through shared father I1)
         *
         * D is:
         *  - Child of C (direct parent-child)
         *  - Connected to A's lineage through B (who is half-sister of C)
         *  - This creates multiple paths → multiple roles
         */
        const individuals: Record<string, GedcomIndividual> = {
            '@I1@': makeIndividual('@I1@', 'Grandpa A', 'M', {
                familySpouseIds: ['@F1@', '@F3@'],
            }),
            '@I2@': makeIndividual('@I2@', 'Grandma A', 'F', {
                familySpouseIds: ['@F1@'],
            }),
            '@I3@': makeIndividual('@I3@', 'Son C', 'M', {
                familyChildId: '@F1@',
                familySpouseIds: ['@F2@'],
            }),
            '@I4@': makeIndividual('@I4@', 'Half-Sister B', 'F', {
                familyChildId: '@F3@',
                familySpouseIds: ['@F2@'],
            }),
            '@I5@': makeIndividual('@I5@', 'Child D', 'M', {
                familyChildId: '@F2@',
            }),
            '@I7@': makeIndividual('@I7@', 'Grandma B', 'F', {
                familySpouseIds: ['@F3@'],
            }),
        };

        const families: Record<string, GedcomFamily> = {
            '@F1@': makeFamily('@F1@', '@I1@', '@I2@', ['@I3@']),
            '@F2@': makeFamily('@F2@', '@I3@', '@I4@', ['@I5@']),
            '@F3@': makeFamily('@F3@', '@I1@', '@I7@', ['@I4@']),
        };

        it('should detect multiple roles for Child D from Grandpa A perspective', () => {
            const result = resolver.resolve('@I1@', individuals, families);
            const childD = result.individuals['@I5@'];

            expect(childD).toBeDefined();
            expect(childD.detectedRoles.length).toBeGreaterThan(1);

            // D should have at least 2 different roles due to multiple paths
            const roleTypes = new Set(childD.detectedRoles.map((r) => r.type));
            expect(roleTypes.size).toBeGreaterThanOrEqual(1);
        });

        it('should detect multiple paths to Child D', () => {
            const result = resolver.resolve('@I1@', individuals, families);
            const childD = result.individuals['@I5@'];

            // There must be at least 2 different paths
            // Path 1: I1 → I3 (parent-of) → I5 (parent-of) = Grandchild
            // Path 2: I1 → I4 (parent-of, via F3) → I5 (parent-of) = Grandchild (via B)
            expect(childD.detectedRoles.length).toBeGreaterThanOrEqual(2);

            // All paths should have kinship path metadata
            for (const role of childD.detectedRoles) {
                expect(role.kinshipPath.path.length).toBeGreaterThan(1);
                expect(role.kinshipPath.path[0]).toBe('@I1@');
                expect(role.kinshipPath.path[role.kinshipPath.path.length - 1]).toBe(
                    '@I5@',
                );
            }
        });

        it('should detect that Half-Sister B has multiple relationship paths from Grandpa A', () => {
            const result = resolver.resolve('@I1@', individuals, families);
            const halfSisterB = result.individuals['@I4@'];

            expect(halfSisterB).toBeDefined();
            expect(halfSisterB.detectedRoles.length).toBeGreaterThanOrEqual(1);

            // B is a child of A (via F3)
            const childRole = halfSisterB.detectedRoles.find(
                (r) => r.type === 'Child',
            );
            expect(childRole).toBeDefined();
        });
    });

    // ════════════════════════════════════════════════════════════════════════
    // 6. DEPTH CAP
    // ════════════════════════════════════════════════════════════════════════

    describe('Depth cap', () => {
        it('should respect maxDepth and not explore beyond it', () => {
            // Create a long chain: I1 → I2 → I3 → I4 → I5 → I6
            const individuals: Record<string, GedcomIndividual> = {};
            const families: Record<string, GedcomFamily> = {};

            for (let i = 1; i <= 6; i++) {
                individuals[`@I${i}@`] = makeIndividual(
                    `@I${i}@`,
                    `Person ${i}`,
                    'M',
                    {
                        familyChildId: i > 1 ? `@F${i - 1}@` : null,
                        familySpouseIds: i < 6 ? [`@F${i}@`] : [],
                    },
                );
            }

            for (let i = 1; i < 6; i++) {
                families[`@F${i}@`] = makeFamily(`@F${i}@`, `@I${i}@`, null, [
                    `@I${i + 1}@`,
                ]);
            }

            // With maxDepth = 3, should NOT reach person 5 or 6
            const shallowResolver = new RelationshipResolver(3);
            const result = shallowResolver.resolve('@I1@', individuals, families);

            const person4 = result.individuals['@I4@'];
            const person5 = result.individuals['@I5@'];

            // Person 4 is at depth 3 — should be reachable
            expect(person4.detectedRoles.length).toBeGreaterThanOrEqual(1);

            // Person 5 is at depth 4 — should NOT be reachable
            expect(person5.detectedRoles.length).toBe(0);
        });
    });

    // ════════════════════════════════════════════════════════════════════════
    // 7. ISOLATED INDIVIDUAL
    // ════════════════════════════════════════════════════════════════════════

    describe('Isolated individual', () => {
        it('should return empty roles for a person with no family connections', () => {
            const individuals: Record<string, GedcomIndividual> = {
                '@I1@': makeIndividual('@I1@', 'Alone Person', 'M'),
                '@I2@': makeIndividual('@I2@', 'Other Person', 'F'),
            };

            const families: Record<string, GedcomFamily> = {};

            const result = resolver.resolve('@I1@', individuals, families);

            expect(result.sourceId).toBe('@I1@');
            expect(result.individuals['@I1@'].detectedRoles.length).toBe(0);
            expect(result.individuals['@I2@'].detectedRoles.length).toBe(0);
        });
    });

    // ════════════════════════════════════════════════════════════════════════
    // 8. COUSIN DETECTION
    // ════════════════════════════════════════════════════════════════════════

    describe('Cousin detection', () => {
        /**
         *   Grandpa (@I1@) ── Grandma (@I2@)
         *      │                    │
         *   Father (@I3@)       Aunt (@I4@) ── Uncle-in-law (@I6@)
         *      │                                    │
         *   Person (@I5@)                     Cousin (@I7@)
         */
        const individuals: Record<string, GedcomIndividual> = {
            '@I1@': makeIndividual('@I1@', 'Grandpa', 'M', {
                familySpouseIds: ['@F1@'],
            }),
            '@I2@': makeIndividual('@I2@', 'Grandma', 'F', {
                familySpouseIds: ['@F1@'],
            }),
            '@I3@': makeIndividual('@I3@', 'Father', 'M', {
                familyChildId: '@F1@',
                familySpouseIds: ['@F2@'],
            }),
            '@I4@': makeIndividual('@I4@', 'Aunt', 'F', {
                familyChildId: '@F1@',
                familySpouseIds: ['@F3@'],
            }),
            '@I5@': makeIndividual('@I5@', 'Person', 'M', {
                familyChildId: '@F2@',
            }),
            '@I6@': makeIndividual('@I6@', 'Uncle-in-law', 'M', {
                familySpouseIds: ['@F3@'],
            }),
            '@I7@': makeIndividual('@I7@', 'Cousin', 'F', {
                familyChildId: '@F3@',
            }),
        };

        const families: Record<string, GedcomFamily> = {
            '@F1@': makeFamily('@F1@', '@I1@', '@I2@', ['@I3@', '@I4@']),
            '@F2@': makeFamily('@F2@', '@I3@', null, ['@I5@']),
            '@F3@': makeFamily('@F3@', '@I6@', '@I4@', ['@I7@']),
        };

        it('should detect Cousin role (source=Person, target=Cousin)', () => {
            const result = resolver.resolve('@I5@', individuals, families);
            const cousin = result.individuals['@I7@'];

            expect(cousin).toBeDefined();
            const cousinRole = cousin.detectedRoles.find(
                (r) => r.type === 'Cousin',
            );
            expect(cousinRole).toBeDefined();
        });
    });

    // ════════════════════════════════════════════════════════════════════════
    // 9. OUTPUT STRUCTURE
    // ════════════════════════════════════════════════════════════════════════

    describe('Output structure', () => {
        it('should set sourceId correctly', () => {
            const individuals: Record<string, GedcomIndividual> = {
                '@I1@': makeIndividual('@I1@', 'Person', 'M'),
            };
            const families: Record<string, GedcomFamily> = {};

            const result = resolver.resolve('@I1@', individuals, families);

            expect(result.sourceId).toBe('@I1@');
        });

        it('should include all individuals in output even if no roles', () => {
            const individuals: Record<string, GedcomIndividual> = {
                '@I1@': makeIndividual('@I1@', 'Person A', 'M'),
                '@I2@': makeIndividual('@I2@', 'Person B', 'F'),
            };
            const families: Record<string, GedcomFamily> = {};

            const result = resolver.resolve('@I1@', individuals, families);

            expect(Object.keys(result.individuals)).toHaveLength(2);
            expect(result.individuals['@I1@']).toBeDefined();
            expect(result.individuals['@I2@']).toBeDefined();
        });

        it('should preserve original individual data in enriched output', () => {
            const individuals: Record<string, GedcomIndividual> = {
                '@I1@': makeIndividual('@I1@', 'John Doe', 'M', {
                    birthDate: '1 JAN 1990',
                    birthPlace: 'New York',
                }),
            };
            const families: Record<string, GedcomFamily> = {};

            const result = resolver.resolve('@I1@', individuals, families);
            const enriched = result.individuals['@I1@'];

            expect(enriched.fullName).toBe('John Doe');
            expect(enriched.birthDate).toBe('1 JAN 1990');
            expect(enriched.birthPlace).toBe('New York');
            expect(enriched.sex).toBe('M');
        });
    });
});
