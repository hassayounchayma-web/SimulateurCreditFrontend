export type ScenarioCode =
  | 'SANS_RACHAT'
  | 'RACHAT_INTERNE'
  | 'RACHAT_EXTERNE';

export interface ParametreMarge {
  id: number;
  scenario: ScenarioCode;
  typeCredit: string;
  marge: number;
  maxMois: number;
  dateModification?: string;
}

export interface ParametrageResponse {
  tmm: number;
  marges: ParametreMarge[];
}

export interface UpdateTmmRequest {
  valeur: number;
}

export interface UpdateMargeRequest {
  marge: number;
}
