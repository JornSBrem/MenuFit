import type { BronzeLikeWeekPayload, SilverTransformOutput, TransformContext } from "./types";
import { transformBronzeToSilver } from "./transformer";

export interface ReprocessInput {
  sourceObjectId: string;
  payload: BronzeLikeWeekPayload;
  year: number;
  week: number;
  kcal: number;
  basePersons: number;
}

export interface ReprocessOptions {
  transformVersion: string;
  canonicalRulesetVersion: string;
  synonymDictVersion: string;
}

export const reprocessSilverTransforms = (
  inputs: ReprocessInput[],
  options: ReprocessOptions,
): SilverTransformOutput[] =>
  inputs.map((input) => {
    const context: TransformContext = {
      sourceObjectId: input.sourceObjectId,
      year: input.year,
      week: input.week,
      kcal: input.kcal,
      basePersons: input.basePersons,
      transformVersion: options.transformVersion,
      canonicalRulesetVersion: options.canonicalRulesetVersion,
      synonymDictVersion: options.synonymDictVersion,
    };
    return transformBronzeToSilver(input.payload, context);
  });
