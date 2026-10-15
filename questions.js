// Youth Voice Questionnaire v2 — question flow (English + Hindi draft).
// type: say | number | choice | multi | open
// stage: about | dream | belief | path | support | voice
// Hindi text is a working draft: have a native speaker review before field use.

export const STAGES = {
  about:   { en: "About you",   hi: "आपके बारे में" },
  dream:   { en: "Dream",       hi: "सपना" },
  belief:  { en: "Belief",      hi: "भरोसा" },
  path:    { en: "Path",        hi: "रास्ता" },
  support: { en: "Support",     hi: "सहारा" },
  voice:   { en: "Your voice",  hi: "आपकी आवाज़" },
};

const studying = a => ["studying", "both"].includes(a.A4?.value);

export const FLOW = [
  { id: "O", type: "say", stage: "about",
    text: { en: "Hi! We want to hear how young people like you see their future. There are no right or wrong answers, and it takes about 6 minutes. You can answer by speaking, or type if you prefer. Let's begin.",
            hi: "नमस्ते! हम जानना चाहते हैं कि आप जैसे युवा अपने भविष्य को कैसे देखते हैं। कोई जवाब सही या गलत नहीं है, और इसमें लगभग 6 मिनट लगेंगे। आप बोलकर जवाब दे सकते हैं, या चाहें तो लिख सकते हैं। चलिए शुरू करते हैं।" } },

  { id: "A1", type: "number", stage: "about", min: 10, max: 60, eligible: [15, 29],
    text: { en: "How old are you?", hi: "आपकी उम्र कितनी है?" },
    reprompt: { en: "Please tell me your age as a number, for example nineteen.", hi: "कृपया अपनी उम्र अंकों में बताइए, जैसे उन्नीस।" } },

  { id: "A2", type: "choice", stage: "about",
    text: { en: "Are you a girl or woman, a boy or man, or would you describe yourself another way?",
            hi: "आप लड़की या महिला हैं, लड़का या पुरुष हैं, या खुद को किसी और तरह से बताना चाहेंगे?" },
    options: [
      { v: "female", en: "Female", hi: "महिला", syn: ["female", "girl", "woman", "lady", "लड़की", "महिला", "औरत", "स्त्री", "फीमेल"] },
      { v: "male", en: "Male", hi: "पुरुष", syn: ["male", "boy", "man", "लड़का", "पुरुष", "आदमी", "मेल"] },
      { v: "other", en: "Other", hi: "अन्य", syn: ["other", "another", "non binary", "अन्य", "दूसरा", "कुछ और"], p: 1 },
      { v: "pnts", en: "Prefer not to say", hi: "नहीं बताना चाहते", syn: ["prefer not", "don't want", "rather not", "नहीं बताना", "नहीं बताऊंगा", "नहीं बताऊंगी"], p: 2 },
    ] },

  { id: "A3", type: "open", stage: "about", plain: true,
    text: { en: "Which state and district do you live in?", hi: "आप किस राज्य और किस ज़िले में रहते हैं?" } },

  { id: "A4", type: "choice", stage: "about",
    text: { en: "What are you doing right now? Studying, working, both studying and working, looking for work, or neither?",
            hi: "अभी आप क्या कर रहे हैं? पढ़ाई, काम, पढ़ाई और काम दोनों, काम ढूंढ रहे हैं, या दोनों में से कुछ नहीं?" },
    options: [
      { v: "studying", en: "Studying", hi: "पढ़ाई", syn: ["studying", "study", "student", "college", "school", "पढ़ाई", "पढ़ रहा", "पढ़ रही", "पढ़ता", "पढ़ती", "स्टूडेंट", "कॉलेज", "स्कूल"] },
      { v: "working", en: "Working", hi: "काम", syn: ["working", "work", "job", "employed", "नौकरी", "काम कर", "जॉब"] },
      { v: "both", en: "Both studying and working", hi: "पढ़ाई और काम दोनों", syn: ["both", "दोनों"], p: 2 },
      { v: "looking", en: "Looking for work", hi: "काम ढूंढ रहे हैं", syn: ["looking for", "searching", "job search", "unemployed", "ढूंढ", "तलाश", "खोज रहा", "खोज रही"], p: 3 },
      { v: "neither", en: "Neither", hi: "कुछ नहीं", syn: ["neither", "nothing", "not studying", "at home", "housewife", "कुछ नहीं", "घर पर", "न पढ़ाई"], p: 4 },
    ] },

  { id: "A5", type: "open", stage: "about", plain: true,
    text: a => studying(a)
      ? { en: "What are you studying, and which class or year?", hi: "आप क्या पढ़ रहे हैं, और किस कक्षा या साल में?" }
      : { en: "What is the highest class or course you finished?", hi: "आपने सबसे ऊँची कौन सी कक्षा या कोर्स पूरा किया है?" } },

  { id: "A6", type: "choice", stage: "about",
    text: a => studying(a)
      ? { en: "Is that school or college government, government-aided, private, or open schooling?", hi: "वह स्कूल या कॉलेज सरकारी है, सरकारी सहायता प्राप्त, प्राइवेट, या ओपन स्कूल?" }
      : { en: "Was that school or college government, government-aided, private, or open schooling?", hi: "वह स्कूल या कॉलेज सरकारी था, सरकारी सहायता प्राप्त, प्राइवेट, या ओपन स्कूल?" },
    options: [
      { v: "government", en: "Government", hi: "सरकारी", syn: ["government", "govt", "sarkari", "public", "सरकारी", "गवर्नमेंट"] },
      { v: "aided", en: "Government-aided", hi: "सहायता प्राप्त", syn: ["aided", "सहायता", "अनुदानित"], p: 2 },
      { v: "private", en: "Private", hi: "प्राइवेट", syn: ["private", "प्राइवेट", "निजी", "khasagi"] },
      { v: "open", en: "Open schooling", hi: "ओपन स्कूल", syn: ["open", "nios", "distance", "ignou", "ओपन", "मुक्त"], p: 1 },
      { v: "dk", en: "Don't know", hi: "पता नहीं", syn: ["don't know", "not sure", "no idea", "पता नहीं", "मालूम नहीं"], p: 3 },
    ] },

  { id: "F1", type: "open", stage: "dream", goalSource: true,
    text: { en: "Imagine yourself 10 years from now. What work are you doing?", hi: "कल्पना कीजिए, आज से 10 साल बाद आप कहाँ हैं। आप क्या काम कर रहे हैं?" },
    followThin: { en: "What would a normal day in that work look like?", hi: "उस काम में आपका एक आम दिन कैसा होगा?" },
    followNon: { en: "That's okay. What kind of work do you enjoy, or feel curious about?", hi: "कोई बात नहीं। आपको किस तरह का काम अच्छा लगता है, या किसके बारे में जानने की उत्सुकता है?" },
    codes: ["government job", "teaching or education", "health or medicine", "engineering, IT or technology", "business or self-employment", "law or finance", "creative arts, sports or media", "skilled trade", "social work or NGO", "farming", "unsure or still exploring"] },

  { id: "F2", type: "open", stage: "dream",
    text: { en: "Why does that work matter to you?", hi: "यह काम आपके लिए क्यों मायने रखता है?" },
    followThin: { en: "Can you tell me a little more about why?", hi: "थोड़ा और बताइए, क्यों?" },
    codes: ["money and security", "supporting family", "passion or interest", "serving society", "respect and status", "independence", "inspired by a role model"] },

  { id: "F3", type: "open", stage: "dream",
    text: { en: "Apart from work, what would make that a good life for you?", hi: "काम के अलावा, किन चीज़ों से वह आपके लिए एक अच्छी ज़िंदगी होगी?" },
    followThin: { en: "What would make you happy then: where you live, who is with you, or something else?", hi: "तब आपको किस बात से खुशी मिलेगी: आप कहाँ रहते हैं, आपके साथ कौन है, या कुछ और?" },
    codes: ["financial stability or own house", "family and caring for parents", "peace, health and balance", "independence and freedom", "living near home", "moving to a city or abroad", "travel and experiences", "giving back to society"] },

  { id: "F4", type: "choice", stage: "belief",
    text: { en: "How sure are you that you will get there? Very sure, somewhat sure, or not sure?", hi: "आपको कितना भरोसा है कि आप वहाँ तक पहुँचेंगे? बहुत भरोसा, थोड़ा भरोसा, या भरोसा नहीं?" },
    options: [
      { v: "very", en: "Very sure", hi: "बहुत भरोसा", syn: ["very", "completely", "definitely", "hundred percent", "100", "totally", "बहुत", "पूरा", "पक्का"] },
      { v: "somewhat", en: "Somewhat sure", hi: "थोड़ा भरोसा", syn: ["somewhat", "little", "bit", "partly", "maybe", "fifty", "50", "kind of", "थोड़ा", "कुछ हद", "शायद"], p: 1 },
      { v: "not", en: "Not sure", hi: "भरोसा नहीं", syn: ["not sure", "not very", "not really", "unsure", "not", "no", "don't know", "भरोसा नहीं", "नहीं", "पता नहीं"], p: 2 },
    ] },

  { id: "F5", type: "open", stage: "belief",
    text: { en: "What is the biggest thing that could stop you from getting there?", hi: "वहाँ तक पहुँचने में आपकी सबसे बड़ी रुकावट क्या हो सकती है?" },
    followNon: { en: "And if something did get in the way, what might it be?", hi: "और अगर कोई चीज़ रास्ते में आए, तो वह क्या हो सकती है?" },
    codes: ["money or fees", "too much competition for jobs or exams", "lack of guidance or information", "family expectations or marriage", "gender or safety", "no opportunities nearby", "corruption or unfair system", "health or disability", "self-doubt or fear", "nothing"] },

  { id: "F6", type: "open", stage: "path",
    text: a => {
      const g = a.F1?.goal;
      return g
        ? { en: `You said: ${g}. What is the next step you need to take to get there, or one thing you need to learn?`, hi: `आपने कहा: ${g}। वहाँ तक पहुँचने के लिए आपका अगला कदम क्या है, या कौन सी एक चीज़ आपको सीखनी है?` }
        : { en: "What is the next step you need to take to reach your future, or one thing you need to learn?", hi: "अपने भविष्य तक पहुँचने के लिए आपका अगला कदम क्या है, या कौन सी एक चीज़ आपको सीखनी है?" };
    },
    followThin: { en: "What exactly: a course, an exam, a skill, or something else?", hi: "ठीक-ठीक क्या: कोई कोर्स, कोई परीक्षा, कोई हुनर, या कुछ और?" },
    codes: ["a degree, diploma or course", "passing an exam such as TET, NEET or UPSC", "English or communication skills", "computer or digital skills", "work experience or internship", "money or documents"] },

  { id: "F7", type: "open", stage: "path", nowhereFollow: true,
    text: { en: "Where, or from whom, are you learning that right now?", hi: "वह आप अभी कहाँ से या किससे सीख रहे हैं?" },
    followNowhere: { en: "What is stopping you?", hi: "आपको क्या रोक रहा है?" },
    followThin: { en: "Can you name the place or the person?", hi: "क्या आप उस जगह या व्यक्ति का नाम बता सकते हैं?" },
    codes: ["school or college", "coaching class", "online, YouTube or apps", "workplace or NGO", "family or self-study", "nowhere yet"] },

  { id: "F8", type: "multi", stage: "support",
    text: { en: "When you need advice about your future, who do you go to? You can name more than one: family, teachers, friends or seniors, the internet, AI tools, someone at work, or nobody.",
            hi: "जब आपको अपने भविष्य के बारे में सलाह चाहिए, तो आप किसके पास जाते हैं? आप एक से ज़्यादा बता सकते हैं: परिवार, शिक्षक, दोस्त या सीनियर, इंटरनेट, AI टूल, काम की जगह पर कोई, या कोई नहीं।" },
    options: [
      { v: "family", en: "Parents / family", hi: "परिवार", syn: ["family", "parent", "mother", "father", "mom", "dad", "mummy", "papa", "brother", "sister", "uncle", "aunt", "husband", "wife", "परिवार", "माता", "पिता", "मम्मी", "पापा", "भाई", "बहन", "घर वाले", "माँ"] },
      { v: "teachers", en: "Teachers", hi: "शिक्षक", syn: ["teacher", "sir", "madam", "professor", "lecturer", "principal", "शिक्षक", "टीचर", "सर", "मैडम", "गुरु", "अध्यापक"] },
      { v: "friends", en: "Friends / seniors", hi: "दोस्त / सीनियर", syn: ["friend", "senior", "classmate", "दोस्त", "मित्र", "सीनियर", "साथी"] },
      { v: "internet", en: "Internet / YouTube", hi: "इंटरनेट / यूट्यूब", syn: ["internet", "google", "youtube", "online", "website", "instagram", "इंटरनेट", "गूगल", "यूट्यूब", "ऑनलाइन"] },
      { v: "ai", en: "AI tools", hi: "AI टूल", syn: ["chatgpt", "chat gpt", "ai", "gemini", "copilot", "artificial", "एआई", "चैट जीपीटी"] },
      { v: "work", en: "Someone at work / NGO", hi: "काम की जगह / संस्था", syn: ["colleague", "office", "ngo", "boss", "manager", "mentor", "organisation", "organization", "ऑफिस", "संस्था", "सहकर्मी"] },
      { v: "nobody", en: "Nobody", hi: "कोई नहीं", syn: ["nobody", "no one", "noone", "myself", "on my own", "कोई नहीं", "किसी के पास नहीं", "खुद"], exclusive: true },
    ] },

  { id: "F9", type: "open", stage: "support",
    text: { en: "If one person or place could help you more with your future, who would it be, and what should they do?", hi: "अगर कोई एक व्यक्ति या जगह आपके भविष्य में आपकी ज़्यादा मदद कर सके, तो वह कौन होगा, और उन्हें क्या करना चाहिए?" },
    followThin: { en: "What exactly should they do for you?", hi: "उन्हें आपके लिए ठीक-ठीक क्या करना चाहिए?" },
    codes: ["career guidance or counselling", "financial help or scholarship", "practical exposure or internships", "English or skill classes", "better teaching", "mentorship", "emotional or family support"] },

  { id: "F10", type: "open", stage: "voice",
    text: { en: "If you could change one thing about how young people are prepared for their future, what would it be?", hi: "अगर आप युवाओं को भविष्य के लिए तैयार करने के तरीके में एक चीज़ बदल सकें, तो वह क्या होगी?" },
    followThin: { en: "Can you say a little more about that?", hi: "इसके बारे में थोड़ा और बताइए?" },
    codes: ["career guidance", "practical and skill-based learning", "better teachers and teaching", "less exam pressure", "more choice of subjects", "free or affordable education", "English and communication", "equal access for girls and rural youth"] },

  { id: "C0", type: "say", stage: "about",
    text: { en: "Two last questions. You can skip either one.", hi: "बस दो आखिरी सवाल। आप चाहें तो इन्हें छोड़ सकते हैं।" } },

  { id: "C1", type: "choice", stage: "about", optional: true,
    text: { en: "Do you have any disability or long-term health condition that affects your daily life? Yes, no, or prefer not to say.", hi: "क्या आपको कोई विकलांगता या लंबी बीमारी है जो आपके रोज़ के जीवन पर असर डालती है? हाँ, नहीं, या नहीं बताना चाहते?" },
    options: [
      { v: "no", en: "No", hi: "नहीं", syn: ["no", "nope", "none", "नहीं", "नही", "ना", "illa"] },
      { v: "yes", en: "Yes", hi: "हाँ", syn: ["yes", "yeah", "haan", "हाँ", "हां", "जी हाँ"], p: 1 },
      { v: "pnts", en: "Prefer not to say", hi: "नहीं बताना चाहते", syn: ["prefer not", "don't want", "rather not", "नहीं बताना", "नहीं बताऊंगा", "नहीं बताऊंगी"], p: 2 },
    ] },

  { id: "C1b", type: "open", stage: "about", optional: true, plain: true, show: a => a.C1?.value === "yes",
    text: { en: "If you're comfortable sharing, what kind? You can also say skip.", hi: "अगर आप बताना चाहें, तो किस तरह की? आप 'छोड़ें' भी कह सकते हैं।" } },

  { id: "C2", type: "choice", stage: "about", optional: true, money: true,
    text: { en: "Roughly how much does your whole household earn in a month? Under 10 thousand, 10 to 25 thousand, 25 to 50 thousand, 50 thousand to 1 lakh, or over 1 lakh? You can also say don't know.",
            hi: "आपके पूरे घर की महीने की कमाई लगभग कितनी है? 10 हज़ार से कम, 10 से 25 हज़ार, 25 से 50 हज़ार, 50 हज़ार से 1 लाख, या 1 लाख से ज़्यादा? आप 'पता नहीं' भी कह सकते हैं।" },
    options: [
      { v: "lt10k", en: "Under ₹10,000", hi: "10 हज़ार से कम", syn: [], lo: 0, hi_: 9999 },
      { v: "10-25k", en: "₹10,000–25,000", hi: "10–25 हज़ार", syn: [], lo: 10000, hi_: 24999 },
      { v: "25-50k", en: "₹25,000–50,000", hi: "25–50 हज़ार", syn: [], lo: 25000, hi_: 49999 },
      { v: "50k-1l", en: "₹50,000–1 lakh", hi: "50 हज़ार–1 लाख", syn: [], lo: 50000, hi_: 100000 },
      { v: "gt1l", en: "Over ₹1 lakh", hi: "1 लाख से ज़्यादा", syn: [], lo: 100001, hi_: 1e12 },
      { v: "dk", en: "Don't know", hi: "पता नहीं", syn: ["don't know", "not sure", "no idea", "पता नहीं", "मालूम नहीं"], p: 3 },
      { v: "pnts", en: "Prefer not to say", hi: "नहीं बताना चाहते", syn: ["prefer not", "don't want", "rather not", "can't say", "नहीं बताना", "नहीं बताऊंगा", "नहीं बताऊंगी"], p: 4 },
    ] },
];

export const SCRIPT = {
  end: { en: "Thank you so much for sharing your voice! Your answers will help make things better for young people.", hi: "अपनी आवाज़ साझा करने के लिए बहुत-बहुत धन्यवाद! आपके जवाब युवाओं के लिए चीज़ें बेहतर बनाने में मदद करेंगे।" },
  ineligible: { en: "Thank you! This survey is for young people aged 15 to 29. We have a separate survey for everyone else, and your voice matters there too.", hi: "धन्यवाद! यह सर्वे 15 से 29 साल के युवाओं के लिए है। बाकी सभी के लिए हमारा एक अलग सर्वे है, वहाँ भी आपकी आवाज़ मायने रखती है।" },
  ack: { en: ["Thank you.", "Got it.", "Okay.", "Thanks for sharing."], hi: ["धन्यवाद।", "ठीक है।", "अच्छा।"] },
  choiceRetry: { en: "Sorry, I didn't catch that. You can say one of the options, or tap it on the screen.", hi: "माफ़ कीजिए, मैं समझ नहीं पाई। आप कोई एक विकल्प बोलिए, या स्क्रीन पर उसे दबाइए।" },
  silence: { en: "Take your time. You can also type your answer.", hi: "आराम से सोचिए। आप जवाब लिख भी सकते हैं।" },
  skipWord: ["skip", "next", "pass", "छोड़ें", "छोड़ो", "छोड़ दो", "अगला"],
};
