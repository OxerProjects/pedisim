import { Activity, Bone, Heart, HeartPulse, Scan, TestTube, Search, FileImage, Droplets } from 'lucide-react';

export type CategoryNode = {
  id: string;
  labelHE: string;
  labelEN: string;
  icon?: any; // Lucide icon
  children?: CategoryNode[];
};

export const categoryTree: CategoryNode[] = [
  {
    id: "XRAY",
    labelHE: "צילומי רנטגן (חזה)",
    labelEN: "Chest X-ray",
    icon: Bone,
  },
  {
    id: "ECG",
    labelHE: "א.ק.ג",
    labelEN: "ECG",
    icon: HeartPulse,
  },
  {
    id: "CT",
    labelHE: "צילומי CT",
    labelEN: "CT Scans",
    icon: Scan,
    children: [
      { id: "CT_HEAD", labelHE: "ראש", labelEN: "Head" },
      { id: "CT_CHEST", labelHE: "חזה", labelEN: "Chest" },
      { id: "CT_ABDOMEN", labelHE: "בטן", labelEN: "Abdomen" }
    ]
  },
  {
    id: "US",
    labelHE: "צילומי אולטרסאונד",
    labelEN: "Ultrasound",
    icon: Activity,
    children: [
      {
        id: "US_HEART",
        labelHE: "לב",
        labelEN: "Heart",
        children: [
          { id: "US_HEART_SUB", labelHE: "סאב-קסיפואיד", labelEN: "Subxiphoid" },
          { id: "US_HEART_PLAX", labelHE: "פאראסטרנלי (PLAX)", labelEN: "PLAX" },
          { id: "US_HEART_PSAX", labelHE: "פאראסטרנלי (PSAX)", labelEN: "PSAX" },
          { id: "US_HEART_APICAL", labelHE: "אפיקלי 4 חדרים", labelEN: "Apical 4 Chamber" },
          { id: "US_HEART_IVC", labelHE: "IVC (הערכת נפח)", labelEN: "IVC Volume" }
        ]
      },
      {
        id: "US_LUNGS",
        labelHE: "ריאות",
        labelEN: "Lungs",
        children: [
          { id: "US_LUNGS_ANT", labelHE: "קדמי (Anterior)", labelEN: "Anterior" },
          { id: "US_LUNGS_LAT", labelHE: "לטרלי (Lateral)", labelEN: "Lateral" },
          { id: "US_LUNGS_POST", labelHE: "אחורי (Posterior)", labelEN: "Posterior" },
          { id: "US_LUNGS_COST", labelHE: "בסיסי ריאות", labelEN: "Costophrenic angles" }
        ]
      },
      {
        id: "US_RUSH",
        labelHE: "RUSH",
        labelEN: "RUSH",
        children: [
          { id: "US_RUSH_HEART", labelHE: "לב", labelEN: "Heart" },
          { id: "US_RUSH_IVC", labelHE: "IVC", labelEN: "IVC" },
          { id: "US_RUSH_AORTA", labelHE: "אאורטה", labelEN: "Aorta" },
          { id: "US_RUSH_DVT", labelHE: "ורידים פמורליים (DVT)", labelEN: "DVT" },
          { id: "US_RUSH_FAST", labelHE: "FAST (כנוזלים חופשיים)", labelEN: "FAST Free fluid" }
        ]
      },
      {
        id: "US_FAST",
        labelHE: "FAST",
        labelEN: "FAST",
        children: [
          { id: "US_FAST_RUQ", labelHE: "RUQ – כיס מוריסון", labelEN: "RUQ" },
          { id: "US_FAST_LUQ", labelHE: "LUQ – טחול-כליה", labelEN: "LUQ" },
          { id: "US_FAST_PELVIC", labelHE: "אגן – סופראפובי", labelEN: "Pelvic" },
          { id: "US_FAST_PERICARDIAL", labelHE: "פריקרד – סאב-קסיפואיד", labelEN: "Pericardial" }
        ]
      }
    ]
  },
  {
    id: "LABS",
    labelHE: "בדיקות מעבדה",
    labelEN: "Labs",
    icon: TestTube,
    children: [
      { id: "LABS_GASES", labelHE: "גזים", labelEN: "Gases" },
      { id: "LABS_CHEM", labelHE: "כימיה", labelEN: "Chemistry" },
      { id: "LABS_CBC", labelHE: "ספירה", labelEN: "CBC" },
      { id: "LABS_COAG", labelHE: "קרישה", labelEN: "Coagulation" },
      { id: "LABS_URINE", labelHE: "שתן", labelEN: "Urine" }
    ]
  },
  {
    id: "PROTOCOLS",
    labelHE: "פרוטוקולי טיפול",
    labelEN: "Protocols",
    icon: FileImage,
  }
];

export function getCategoryPath(pathIds: string[]): CategoryNode[] {
    const nodes: CategoryNode[] = [];
    let currentLevel = categoryTree;
    for (const id of pathIds) {
        const found = currentLevel?.find(n => n.id === id);
        if (found) {
            nodes.push(found);
            currentLevel = found.children || [];
        }
    }
    return nodes;
}
