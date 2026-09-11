import {RegExpMatcher,englishDataset,englishRecommendedTransformers} from 'obscenity';

const matcher=new RegExpMatcher({...englishDataset.build(),...englishRecommendedTransformers});
// Whole-word exceptions only: a legitimate name cannot excuse other text around it.
const ordinaryNames=/\b(?:dickinson|dickson|penistone|ann?alis[ae])\b/gi;
export const CHAT_LANGUAGE_ERROR='Please keep conversations neighborly. Reword your message without profanity and try again.';
export const NAME_LANGUAGE_ERROR='Please choose a character name without profanity.';
export const TOWN_LANGUAGE_ERROR='Please choose a town name without profanity.';

export function hasProfanity(value:string):boolean{
  const normalized=value.normalize('NFKC').normalize('NFKD').replace(/[\p{M}\p{Cf}]/gu,'');
  const check=(text:string)=>matcher.hasMatch(text.replace(ordinaryNames,'neighbor'));
  if(check(normalized))return true;
  // Join punctuation within a word, but never join ordinary words like “push it”.
  const joined=normalized.replace(/(?<=[\p{L}\p{N}])[^\p{L}\p{N}\s]+(?=[\p{L}\p{N}])/gu,'');
  if(check(joined))return true;
  // Also catch a word deliberately spelled out one letter at a time.
  return check(joined.replace(/\b(?:[a-z0-9]\s+){2,}[a-z0-9]\b/gi,word=>word.replace(/\s+/g,'')));
}
