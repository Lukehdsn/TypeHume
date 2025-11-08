/**
 * Transforms AI-generated text into more human-like writing
 * by replacing formal phrases, adding contractions, and varying sentence structure
 */
export function humanizeLocal(text: string): string {
  if (!text.trim()) return ""

  let result = text

  // Replace formal phrases with casual alternatives
  const replacements: Record<string, string> = {
    "in order to": "to",
    "furthermore": "also",
    "moreover": "plus",
    "in addition": "also",
    "in conclusion": "so",
    "to summarize": "in short",
    "it is important to note that": "it's worth noting that",
    "as a matter of fact": "actually",
    "in fact": "actually",
    "consequently": "so",
    "therefore": "so",
    "thus": "so",
    "given that": "since",
    "inasmuch as": "since",
    "with the exception of": "except for",
    "notwithstanding": "still",
    "nonetheless": "still",
    "nevertheless": "still",
    "at the end of the day": "ultimately",
    "it goes without saying": "clearly",
  }

  // Case-insensitive replacement
  Object.entries(replacements).forEach(([formal, casual]) => {
    const regex = new RegExp(`\\b${formal}\\b`, "gi")
    result = result.replace(regex, casual)
  })

  // Add contractions where appropriate
  const contractionMap: Record<string, string> = {
    "is not": "isn't",
    "are not": "aren't",
    "was not": "wasn't",
    "were not": "weren't",
    "have not": "haven't",
    "has not": "hasn't",
    "had not": "hadn't",
    "do not": "don't",
    "does not": "doesn't",
    "did not": "didn't",
    "can not": "can't",
    "could not": "couldn't",
    "should not": "shouldn't",
    "would not": "wouldn't",
    "will not": "won't",
    "shall not": "shan't",
    "cannot": "can't",
    "it is": "it's",
    "that is": "that's",
    "there is": "there's",
    "there are": "there're",
    "i am": "i'm",
    "we are": "we're",
    "you are": "you're",
    "they are": "they're",
    "he is": "he's",
    "she is": "she's",
    "i have": "i've",
    "we have": "we've",
    "you have": "you've",
    "they have": "they've",
    "i will": "i'll",
    "we will": "we'll",
    "you will": "you'll",
    "they will": "they'll",
    "he will": "he'll",
    "she will": "she'll",
  }

  Object.entries(contractionMap).forEach(([expanded, contraction]) => {
    const regex = new RegExp(`\\b${expanded}\\b`, "gi")
    result = result.replace(regex, contraction)
  })

  // Remove hedging language and weakeners
  const hedges = [
    "arguably",
    "perhaps",
    "possibly",
    "seemingly",
    "apparently",
    "it seems that",
    "it appears that",
    "in some sense",
    "sort of",
    "kind of",
    "a bit",
    "quite",
    "somewhat",
    "relatively",
    "comparatively",
  ]

  hedges.forEach((hedge) => {
    const regex = new RegExp(`\\b${hedge}\\s+`, "gi")
    result = result.replace(regex, "")
  })

  // Remove repetitive intensifiers and vary them
  result = result.replace(/very\s+very/gi, "extremely")
  result = result.replace(/\bvery\s+(important|significant|interesting)/gi, (match) => {
    const words = ["really", "quite", "truly", "absolutely"]
    const word = match.split(" ")[1]
    return words[Math.floor(Math.random() * words.length)] + " " + word
  })

  // Vary sentence starters to avoid repetition - keep some sentences as is for variety
  const sentenceStarters = [
    { old: /^([A-Z][^.!?]*?)\s+also\s+/m, new: "Also, " },
    { old: /^([A-Z][^.!?]*?)\s+however\s+/m, new: "However, " },
    { old: /^([A-Z][^.!?]*?)\s+therefore\s+/m, new: "So " },
  ]

  // Break overly long sentences (simplified approach)
  const sentences = result.split(/(?<=[.!?])\s+/)
  const processedSentences = sentences.map((sentence, index) => {
    // Avoid processing every sentence - keep some variety
    if (index % 3 === 0 && sentence.length > 150) {
      const commaIndex = sentence.indexOf(",")
      if (commaIndex > 0 && commaIndex < sentence.length / 2) {
        const parts = sentence.split(",", 1)
        return parts[0].trim() + ". " + sentence.substring(commaIndex + 1).trim()
      }
    }
    return sentence
  })

  result = processedSentences.join(" ")

  // Remove multiple spaces
  result = result.replace(/\s+/g, " ").trim()

  // Fix common spacing issues
  result = result.replace(/\s+([.!?,;:])/g, "$1")
  result = result.replace(/([.!?])\s+(?=[a-z])/g, "$1 ")

  return result
}
