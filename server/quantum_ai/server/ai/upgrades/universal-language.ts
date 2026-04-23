import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface LanguageDetection {
  language: string;
  languageCode: string;
  confidence: number;
  script: string;
  region?: string;
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: LanguageDetection;
  targetLanguage: string;
  confidence: number;
  alternatives?: string[];
  culturalNotes?: string[];
}

export interface MultilingualContext {
  detectedLanguages: LanguageDetection[];
  primaryLanguage: string;
  isMultilingual: boolean;
  translationNeeded: boolean;
  suggestedResponseLanguage: string;
}

export interface TerminologyResult {
  term: string;
  domain: string;
  definition: string;
  simplifiedExplanation: string;
  translations: Record<string, string>;
}

export class UniversalLanguageEngine {
  private supportedLanguages: Map<string, string> = new Map();
  private languageHistory: Map<string, string[]> = new Map();
  private commonPhraseCache: Map<string, string> = new Map();

  private languagePatterns: Record<string, RegExp> = {
    'zh': /[\u4e00-\u9fff]/,
    'ja': /[\u3040-\u309f\u30a0-\u30ff]/,
    'ko': /[\uac00-\ud7af]/,
    'ar': /[\u0600-\u06ff]/,
    'he': /[\u0590-\u05ff]/,
    'th': /[\u0e00-\u0e7f]/,
    'ru': /[\u0400-\u04ff]/,
    'el': /[\u0370-\u03ff]/,
    'hi': /[\u0900-\u097f]/,
    'bn': /[\u0980-\u09ff]/,
  };

  constructor() {
    console.log('[Universal Language] Initializing multilingual cognition engine with 196+ languages');
    this.initializeSupportedLanguages();
  }

  private initializeSupportedLanguages(): void {
    const languages = [
      ['en', 'English'], ['es', 'Spanish'], ['fr', 'French'], ['de', 'German'],
      ['it', 'Italian'], ['pt', 'Portuguese'], ['ru', 'Russian'], ['zh', 'Chinese'],
      ['ja', 'Japanese'], ['ko', 'Korean'], ['ar', 'Arabic'], ['hi', 'Hindi'],
      ['bn', 'Bengali'], ['pa', 'Punjabi'], ['te', 'Telugu'], ['mr', 'Marathi'],
      ['ta', 'Tamil'], ['ur', 'Urdu'], ['gu', 'Gujarati'], ['kn', 'Kannada'],
      ['or', 'Odia'], ['ml', 'Malayalam'], ['si', 'Sinhala'], ['th', 'Thai'],
      ['vi', 'Vietnamese'], ['id', 'Indonesian'], ['ms', 'Malay'], ['tl', 'Filipino'],
      ['tr', 'Turkish'], ['pl', 'Polish'], ['uk', 'Ukrainian'], ['ro', 'Romanian'],
      ['nl', 'Dutch'], ['el', 'Greek'], ['cs', 'Czech'], ['sv', 'Swedish'],
      ['hu', 'Hungarian'], ['fi', 'Finnish'], ['da', 'Danish'], ['no', 'Norwegian'],
      ['he', 'Hebrew'], ['fa', 'Persian'], ['sw', 'Swahili'], ['am', 'Amharic'],
      ['yo', 'Yoruba'], ['ig', 'Igbo'], ['zu', 'Zulu'], ['xh', 'Xhosa'],
      ['af', 'Afrikaans'], ['sn', 'Shona'], ['ha', 'Hausa'], ['rw', 'Kinyarwanda'],
      ['tn', 'Setswana'], ['st', 'Sesotho'], ['ts', 'Tsonga'], ['ve', 'Venda'],
      ['bg', 'Bulgarian'], ['hr', 'Croatian'], ['sr', 'Serbian'], ['sk', 'Slovak'],
      ['sl', 'Slovenian'], ['mk', 'Macedonian'], ['bs', 'Bosnian'], ['sq', 'Albanian'],
      ['lv', 'Latvian'], ['lt', 'Lithuanian'], ['et', 'Estonian'], ['mt', 'Maltese'],
      ['is', 'Icelandic'], ['ga', 'Irish'], ['cy', 'Welsh'], ['gd', 'Scottish Gaelic'],
      ['eu', 'Basque'], ['ca', 'Catalan'], ['gl', 'Galician'], ['oc', 'Occitan'],
      ['az', 'Azerbaijani'], ['ka', 'Georgian'], ['hy', 'Armenian'], ['kk', 'Kazakh'],
      ['uz', 'Uzbek'], ['ky', 'Kyrgyz'], ['tg', 'Tajik'], ['tk', 'Turkmen'],
      ['mn', 'Mongolian'], ['my', 'Burmese'], ['lo', 'Lao'], ['km', 'Khmer'],
      ['ne', 'Nepali'], ['as', 'Assamese'], ['sd', 'Sindhi'], ['ps', 'Pashto'],
      ['ku', 'Kurdish'], ['ug', 'Uyghur'], ['bo', 'Tibetan'], ['dz', 'Dzongkha'],
      ['ti', 'Tigrinya'], ['om', 'Oromo'], ['so', 'Somali'], ['mg', 'Malagasy'],
      ['ny', 'Chichewa'], ['lg', 'Luganda'], ['rn', 'Kirundi'], ['lu', 'Luba-Katanga'],
      ['ln', 'Lingala'], ['kg', 'Kongo'], ['tw', 'Twi'], ['ak', 'Akan'],
      ['ee', 'Ewe'], ['ff', 'Fulah'], ['wo', 'Wolof'], ['bm', 'Bambara'],
      ['sg', 'Sango'], ['mos', 'Mossi'], ['dyu', 'Dyula'], ['se', 'Northern Sami'],
      ['mi', 'Maori'], ['sm', 'Samoan'], ['to', 'Tongan'], ['fj', 'Fijian'],
      ['haw', 'Hawaiian'], ['ty', 'Tahitian'], ['tpi', 'Tok Pisin'], ['bi', 'Bislama'],
      ['ht', 'Haitian Creole'], ['pap', 'Papiamento'], ['qu', 'Quechua'], ['ay', 'Aymara'],
      ['gn', 'Guarani'], ['nah', 'Nahuatl'], ['yua', 'Yucatec Maya'], ['ce', 'Chechen'],
      ['os', 'Ossetian'], ['ab', 'Abkhazian'], ['av', 'Avaric'], ['ba', 'Bashkir'],
      ['tt', 'Tatar'], ['cv', 'Chuvash'], ['sah', 'Sakha'], ['udm', 'Udmurt'],
      ['kv', 'Komi'], ['mhr', 'Mari'], ['myv', 'Erzya'], ['chm', 'Meadow Mari'],
      ['jv', 'Javanese'], ['su', 'Sundanese'], ['mad', 'Madurese'], ['min', 'Minangkabau'],
      ['ace', 'Acehnese'], ['ban', 'Balinese'], ['bjn', 'Banjar'], ['bug', 'Buginese'],
      ['ceb', 'Cebuano'], ['ilo', 'Ilocano'], ['war', 'Waray'], ['pam', 'Kapampangan'],
      ['bcl', 'Central Bikol'], ['hil', 'Hiligaynon'], ['cbk', 'Chavacano'], ['zh-TW', 'Traditional Chinese'],
      ['zh-HK', 'Cantonese'], ['nan', 'Min Nan'], ['wuu', 'Wu Chinese'], ['yue', 'Cantonese'],
      ['hak', 'Hakka'], ['hsn', 'Xiang'], ['gan', 'Gan'], ['cdo', 'Eastern Min'],
      ['pt-BR', 'Brazilian Portuguese'], ['es-MX', 'Mexican Spanish'], ['es-AR', 'Argentine Spanish'],
      ['en-GB', 'British English'], ['en-AU', 'Australian English'], ['en-IN', 'Indian English'],
      ['fr-CA', 'Canadian French'], ['fr-BE', 'Belgian French'], ['fr-CH', 'Swiss French'],
      ['de-AT', 'Austrian German'], ['de-CH', 'Swiss German'], ['nl-BE', 'Flemish'],
      ['sr-Latn', 'Serbian Latin'], ['bs-Latn', 'Bosnian Latin'], ['chr', 'Cherokee'],
      ['nv', 'Navajo'], ['oj', 'Ojibwe'], ['cr', 'Cree'], ['iu', 'Inuktitut'],
      ['kl', 'Greenlandic'], ['fy', 'Frisian'], ['lb', 'Luxembourgish'], ['fo', 'Faroese'],
      ['rm', 'Romansh'], ['sc', 'Sardinian'], ['co', 'Corsican'], ['li', 'Limburgish'],
      ['wa', 'Walloon'], ['an', 'Aragonese'], ['ast', 'Asturian'], ['fur', 'Friulian'],
      ['lij', 'Ligurian'], ['nap', 'Neapolitan'], ['scn', 'Sicilian'], ['vec', 'Venetian'],
      ['lmo', 'Lombard'], ['pms', 'Piedmontese'], ['eml', 'Emilian-Romagnol'], ['lld', 'Ladin'],
      ['gsw', 'Alemannic'], ['bar', 'Bavarian'], ['hsb', 'Upper Sorbian'], ['dsb', 'Lower Sorbian'],
      ['csb', 'Kashubian'], ['szl', 'Silesian'], ['rue', 'Rusyn'], ['be', 'Belarusian'],
      ['yi', 'Yiddish'], ['la', 'Latin'], ['grc', 'Ancient Greek'], ['sa', 'Sanskrit'],
      ['pi', 'Pali'], ['eo', 'Esperanto'], ['ia', 'Interlingua'], ['vo', 'Volapük'],
      ['io', 'Ido'], ['ie', 'Interlingue'], ['nov', 'Novial'], ['jbo', 'Lojban'],
      ['lfn', 'Lingua Franca Nova'], ['tok', 'Toki Pona']
    ];

    for (const [code, name] of languages) {
      this.supportedLanguages.set(code, name);
    }
    console.log(`[Universal Language] Loaded ${this.supportedLanguages.size} languages`);
  }

  async detectLanguage(text: string): Promise<LanguageDetection> {
    for (const [code, pattern] of Object.entries(this.languagePatterns)) {
      if (pattern.test(text)) {
        return {
          language: this.supportedLanguages.get(code) || code,
          languageCode: code,
          confidence: 0.95,
          script: this.getScriptName(code)
        };
      }
    }

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Detect the language of the text. Return JSON with:
- language: full language name
- languageCode: ISO 639-1 code
- confidence: 0-1
- script: writing system name
- region: optional regional variant
Return only valid JSON.`
          },
          { role: 'user', content: text }
        ],
        max_tokens: 100,
        temperature: 0.1
      });

      const content = response.choices[0].message.content || '{}';
      const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));

      return {
        language: parsed.language || 'English',
        languageCode: parsed.languageCode || 'en',
        confidence: parsed.confidence || 0.8,
        script: parsed.script || 'Latin',
        region: parsed.region
      };
    } catch (error) {
      console.error('[Universal Language] Detection error:', error);
      return {
        language: 'English',
        languageCode: 'en',
        confidence: 0.5,
        script: 'Latin'
      };
    }
  }

  private getScriptName(code: string): string {
    const scripts: Record<string, string> = {
      'zh': 'Han (Chinese)',
      'ja': 'Japanese (Hiragana/Katakana/Kanji)',
      'ko': 'Hangul',
      'ar': 'Arabic',
      'he': 'Hebrew',
      'th': 'Thai',
      'ru': 'Cyrillic',
      'el': 'Greek',
      'hi': 'Devanagari',
      'bn': 'Bengali'
    };
    return scripts[code] || 'Latin';
  }

  async translate(
    text: string,
    targetLanguage: string,
    options?: {
      sourceLanguage?: string;
      preserveTone?: boolean;
      formalityLevel?: 'formal' | 'informal' | 'neutral';
      domain?: string;
    }
  ): Promise<TranslationResult> {
    const sourceDetection = options?.sourceLanguage 
      ? { language: options.sourceLanguage, languageCode: options.sourceLanguage, confidence: 1, script: 'Unknown' }
      : await this.detectLanguage(text);

    try {
      const formalityInstruction = options?.formalityLevel 
        ? `Use ${options.formalityLevel} register.` 
        : '';
      
      const domainInstruction = options?.domain 
        ? `This is ${options.domain} domain text.` 
        : '';

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert translator. Translate the following text to ${targetLanguage}.
${formalityInstruction}
${domainInstruction}
${options?.preserveTone ? 'Preserve the original tone and style.' : ''}

Return JSON with:
- translatedText: the translation
- confidence: 0-1 translation confidence
- alternatives: array of alternative translations (up to 2)
- culturalNotes: array of cultural context notes if relevant
Return only valid JSON.`
          },
          { role: 'user', content: text }
        ],
        max_tokens: 2000,
        temperature: 0.3
      });

      const content = response.choices[0].message.content || '{}';
      const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));

      return {
        originalText: text,
        translatedText: parsed.translatedText || text,
        sourceLanguage: sourceDetection,
        targetLanguage,
        confidence: parsed.confidence || 0.85,
        alternatives: parsed.alternatives,
        culturalNotes: parsed.culturalNotes
      };
    } catch (error) {
      console.error('[Universal Language] Translation error:', error);
      return {
        originalText: text,
        translatedText: text,
        sourceLanguage: sourceDetection,
        targetLanguage,
        confidence: 0,
        alternatives: [],
        culturalNotes: ['Translation failed - showing original text']
      };
    }
  }

  async translateMultiple(
    text: string,
    targetLanguages: string[]
  ): Promise<Record<string, TranslationResult>> {
    const results: Record<string, TranslationResult> = {};
    
    const translations = await Promise.all(
      targetLanguages.map(lang => this.translate(text, lang))
    );

    for (let i = 0; i < targetLanguages.length; i++) {
      results[targetLanguages[i]] = translations[i];
    }

    return results;
  }

  async simplifyTerminology(
    text: string,
    domain: 'legal' | 'medical' | 'technical' | 'scientific' | 'financial'
  ): Promise<{
    originalText: string;
    simplifiedText: string;
    termsExplained: TerminologyResult[];
  }> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert at simplifying ${domain} terminology for general audiences.
Analyze the text and:
1. Rewrite it in plain, simple language
2. Identify technical terms and explain them
3. Keep the meaning accurate while making it accessible

Return JSON with:
- simplifiedText: the simplified version
- termsExplained: array of {term, definition, simplifiedExplanation}
Return only valid JSON.`
          },
          { role: 'user', content: text }
        ],
        max_tokens: 2000,
        temperature: 0.4
      });

      const content = response.choices[0].message.content || '{}';
      const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));

      return {
        originalText: text,
        simplifiedText: parsed.simplifiedText || text,
        termsExplained: (parsed.termsExplained || []).map((t: any) => ({
          term: t.term,
          domain,
          definition: t.definition,
          simplifiedExplanation: t.simplifiedExplanation,
          translations: {}
        }))
      };
    } catch (error) {
      console.error('[Universal Language] Simplification error:', error);
      return {
        originalText: text,
        simplifiedText: text,
        termsExplained: []
      };
    }
  }

  async getMultilingualContext(
    conversationHistory: Array<{ role: string; content: string }>
  ): Promise<MultilingualContext> {
    const detectedLanguages: LanguageDetection[] = [];
    const languageCounts: Record<string, number> = {};

    for (const msg of conversationHistory.slice(-10)) {
      const detection = await this.detectLanguage(msg.content);
      detectedLanguages.push(detection);
      languageCounts[detection.languageCode] = (languageCounts[detection.languageCode] || 0) + 1;
    }

    const primaryLanguage = Object.entries(languageCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'en';

    const uniqueLanguages = new Set(detectedLanguages.map(d => d.languageCode));
    const isMultilingual = uniqueLanguages.size > 1;

    const lastUserMessage = conversationHistory.filter(m => m.role === 'user').pop();
    const lastMessageLang = lastUserMessage 
      ? (await this.detectLanguage(lastUserMessage.content)).languageCode 
      : primaryLanguage;

    return {
      detectedLanguages,
      primaryLanguage: this.supportedLanguages.get(primaryLanguage) || primaryLanguage,
      isMultilingual,
      translationNeeded: isMultilingual,
      suggestedResponseLanguage: this.supportedLanguages.get(lastMessageLang) || 'English'
    };
  }

  async generateMultilingualResponse(
    message: string,
    systemPrompt: string,
    preferredLanguage?: string
  ): Promise<string> {
    const detection = await this.detectLanguage(message);
    const responseLanguage = preferredLanguage || detection.language;

    if (detection.languageCode === 'en' && responseLanguage === 'English') {
      return systemPrompt;
    }

    return `${systemPrompt}

LANGUAGE CONTEXT:
- User's message language: ${detection.language} (${detection.languageCode})
- Preferred response language: ${responseLanguage}
- Script: ${detection.script}

IMPORTANT: Respond in ${responseLanguage}. Match the user's language preference.
If the user writes in their native language, respond in that same language fluently.`;
  }

  getSupportedLanguages(): { code: string; name: string }[] {
    return Array.from(this.supportedLanguages.entries()).map(([code, name]) => ({
      code,
      name
    }));
  }

  async crossLingualSearch(
    query: string,
    targetLanguages: string[]
  ): Promise<Record<string, string>> {
    const translations: Record<string, string> = {};
    
    for (const lang of targetLanguages) {
      const result = await this.translate(query, lang);
      translations[lang] = result.translatedText;
    }

    return translations;
  }
}

export const universalLanguage = new UniversalLanguageEngine();
