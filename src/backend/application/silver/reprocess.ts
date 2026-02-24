import type { PersistentStateStore } from "../../integrations/storage/persistent-state-store.ts";
import type { BronzeLikeWeekPayload, SilverTransformOutput, TransformContext } from "./types";
import { transformBronzeToSilver } from "./transformer.ts";

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
  stateStore?: PersistentStateStore;
}

const silverTransformKey = (context: TransformContext): string =>
  `${context.year}:${context.week}:${context.kcal}:${context.basePersons}:${context.transformVersion}`;

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
    const output = transformBronzeToSilver(input.payload, context);
    if (options.stateStore) {
      const key = silverTransformKey(context);
      options.stateStore.update((draft) => {
        draft.silverTransforms[key] = structuredClone(output);
      });
    }
    return output;
  });
