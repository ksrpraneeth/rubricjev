// Everyday knowledge: 25 questions anyone can answer in their own words.
// Shape: { id, title, description, questions: [{ id, topic, prompt, points, rubric, misconceptions }] }
// - points: the answer key shown to Jev (never to the learner)
// - rubric: each line becomes a yes/no check "The learner's answer <line>."
// - misconceptions: each line becomes a check that should come back NO

export default {
  id: "everyday",
  title: "Everyday knowledge",
  description: "Money, health, kitchen, safety, and the world around us. No technical background needed.",
  questions: [
    // ---------- Money basics ----------
    {
      id: "money-emergency-fund",
      topic: "Money basics",
      prompt: "What is an emergency fund and how big should it be?",
      points: [
        "Money set aside for unexpected costs such as job loss, medical bills or repairs",
        "Usually three to six months of essential expenses",
        "Kept somewhere safe and easy to access, such as a savings account, not invested in risky assets",
      ],
      rubric: [
        "says it is money kept aside for unexpected expenses or loss of income",
        "gives a size in months of expenses, roughly three to six months",
        "says it should be easy to access, such as a savings account, rather than locked up or in risky investments",
      ],
      misconceptions: ["suggests investing the emergency fund in stocks or other risky assets"],
    },
    {
      id: "money-compound",
      topic: "Money basics",
      prompt: "Explain compound interest in simple words.",
      points: [
        "You earn interest on your original money and also on the interest already earned",
        "Growth speeds up over time",
        "Starting early matters more than the amount because of the time it has to grow",
        "Works against you on loans and credit cards too",
      ],
      rubric: [
        "explains that interest is earned on previously earned interest, not only on the original amount",
        "says growth accelerates or snowballs over time",
        "mentions that starting early or giving it time makes a big difference",
      ],
      misconceptions: ["describes simple interest, where interest is only ever earned on the original amount"],
    },
    {
      id: "money-credit-card",
      topic: "Money basics",
      prompt: "Why is paying only the minimum amount on a credit card a bad idea?",
      points: [
        "The remaining balance is charged very high interest, often 30 to 45 percent a year",
        "Interest compounds monthly, so the debt grows fast",
        "It can take years to clear even a small balance",
        "Paying the full statement amount each month avoids interest entirely",
      ],
      rubric: [
        "says the unpaid balance attracts high interest",
        "says the debt grows or takes a very long time to clear when paying only the minimum",
        "says paying the full bill each month avoids interest",
      ],
      misconceptions: ["claims paying the minimum means no interest is charged"],
    },
    {
      id: "money-inflation",
      topic: "Money basics",
      prompt: "What is inflation and how does it affect savings kept in cash?",
      points: [
        "Prices rise over time, so the same money buys less",
        "Cash that earns less than inflation loses purchasing power",
        "That is why savings need to earn a return at or above inflation",
      ],
      rubric: [
        "says inflation means prices go up over time",
        "says the same amount of money buys less as a result",
        "says cash or savings earning less than inflation lose real value or purchasing power",
      ],
      misconceptions: ["claims that keeping money as cash keeps its value safe over the long term"],
    },
    {
      id: "money-insurance",
      topic: "Money basics",
      prompt: "What is the point of insurance, and what does a premium and a deductible mean?",
      points: [
        "Insurance transfers the risk of a large loss to the insurer in exchange for a small regular payment",
        "The premium is the regular amount you pay",
        "The deductible or excess is the part of a claim you pay yourself before the insurer pays",
      ],
      rubric: [
        "says insurance protects against large or unexpected losses in exchange for regular payments",
        "defines the premium as the regular payment to the insurer",
        "defines the deductible or excess as the part of a claim you pay yourself",
      ],
      misconceptions: ["claims insurance is a way to make money or get back more than you paid"],
    },

    // ---------- Health and food ----------
    {
      id: "health-hydration",
      topic: "Health and food",
      prompt: "How can you tell if you are drinking enough water during the day?",
      points: [
        "Urine colour is pale yellow when well hydrated, dark when not",
        "Thirst, headache, tiredness and dry mouth are signs of dehydration",
        "Needs go up with heat, exercise and illness",
        "Water from food and other drinks also counts",
      ],
      rubric: [
        "mentions urine colour as a sign, pale meaning hydrated and dark meaning dehydrated",
        "names at least one symptom of dehydration such as thirst, headache, tiredness or dry mouth",
        "says needs increase with heat, exercise or illness",
      ],
      misconceptions: ["claims everyone must drink exactly eight glasses regardless of circumstances"],
    },
    {
      id: "health-protein",
      topic: "Health and food",
      prompt: "Why does the body need protein, and name a few good sources.",
      points: [
        "Builds and repairs muscle, skin and tissues; makes enzymes and hormones",
        "Helps you feel full",
        "Sources: dal and legumes, eggs, dairy such as paneer and curd, fish, chicken, nuts, soy",
      ],
      rubric: [
        "says protein builds or repairs muscles and body tissues",
        "names at least two protein sources such as dal, eggs, paneer, curd, fish, chicken, nuts or soy",
        "mentions a further role such as feeling full, or making enzymes, hormones or immune cells",
      ],
      misconceptions: ["claims vegetarians cannot get enough protein"],
    },
    {
      id: "health-sugar",
      topic: "Health and food",
      prompt: "What happens in the body when you eat a lot of sugar, and why is it a concern?",
      points: [
        "Blood sugar spikes quickly, insulin is released, then it can crash leaving you tired and hungry",
        "Excess is stored as fat and raises the risk of weight gain and type 2 diabetes",
        "Sugary drinks are the biggest hidden source",
        "Fruit contains fibre that slows absorption, unlike added sugar",
      ],
      rubric: [
        "says blood sugar rises quickly and then drops, or mentions insulin",
        "links excess sugar to weight gain, diabetes or another long-term risk",
        "mentions that added sugar or sugary drinks are the main concern, or that whole fruit is different because of fibre",
      ],
      misconceptions: ["claims sugar from fruit is just as harmful as sugar in soft drinks"],
    },
    {
      id: "health-sleep",
      topic: "Health and food",
      prompt: "Why is sleep important, and what helps you sleep better?",
      points: [
        "The body repairs itself, the brain consolidates memory and clears waste",
        "Poor sleep affects mood, focus, immunity and appetite",
        "Helps: fixed sleep and wake times, dark cool room, no screens or caffeine late, daylight in the morning",
      ],
      rubric: [
        "names at least one thing sleep does, such as memory, repair, immunity or mood",
        "names at least one consequence of poor sleep",
        "gives at least two practical habits such as fixed timings, a dark room, avoiding screens or caffeine late, or morning daylight",
      ],
      misconceptions: ["claims you can fully make up for lost sleep on weekends"],
    },
    {
      id: "health-fever",
      topic: "Health and food",
      prompt: "When is a fever a reason to see a doctor rather than rest at home?",
      points: [
        "Very high temperature, roughly above 39.5 to 40 degrees Celsius",
        "Fever lasting more than two to three days",
        "Warning signs: stiff neck, rash, breathing difficulty, confusion, severe headache, dehydration",
        "Infants, elderly, pregnant or people with weak immunity should be seen sooner",
      ],
      rubric: [
        "gives a duration threshold such as more than two or three days",
        "names at least one warning sign such as stiff neck, rash, breathing trouble, confusion or dehydration",
        "mentions that babies, elderly or vulnerable people need a doctor sooner",
      ],
      misconceptions: ["claims antibiotics should be taken for every fever"],
    },

    // ---------- Kitchen and home ----------
    {
      id: "home-food-safety",
      topic: "Kitchen and home",
      prompt: "How should cooked food be stored so it stays safe to eat?",
      points: [
        "Cool and refrigerate within about two hours",
        "Keep the fridge below 5 degrees Celsius",
        "Use within two to three days; reheat until steaming hot",
        "Do not reheat rice or food more than once",
      ],
      rubric: [
        "says food should go into the fridge soon after cooking, within roughly two hours",
        "gives a time limit for eating leftovers, around two to three days",
        "says food should be reheated until very hot, or warns against reheating more than once",
      ],
      misconceptions: ["claims cooked food is safe at room temperature overnight"],
    },
    {
      id: "home-pressure-cooker",
      topic: "Kitchen and home",
      prompt: "Why does food cook faster in a pressure cooker?",
      points: [
        "The sealed pot traps steam and raises the pressure",
        "Higher pressure raises the boiling point of water above 100 degrees Celsius",
        "Hotter water and steam cook food faster",
      ],
      rubric: [
        "says the cooker seals in steam and builds pressure",
        "says higher pressure raises the boiling point or lets water get hotter than 100 degrees",
        "links the higher temperature to faster cooking",
      ],
      misconceptions: ["claims the pressure itself squeezes the food to cook it"],
    },
    {
      id: "home-oil-fire",
      topic: "Kitchen and home",
      prompt: "What should you do if oil catches fire in a pan?",
      points: [
        "Turn off the heat",
        "Cover with a lid or a metal tray to cut off oxygen",
        "Never pour water on it, water makes the burning oil explode outward",
        "Leave the pan where it is; do not carry it",
      ],
      rubric: [
        "says to turn off the heat",
        "says to cover the pan with a lid or something to smother the flames",
        "says never to use water on an oil fire",
      ],
      misconceptions: ["suggests pouring water on the burning oil"],
    },
    {
      id: "home-electric-bill",
      topic: "Kitchen and home",
      prompt: "Which appliances use the most electricity at home and how can you cut the bill?",
      points: [
        "Heating and cooling: AC, geyser, iron, and anything that heats or cools",
        "Old fridges and running many devices on standby add up",
        "Cuts: AC at 24 to 26 degrees, switch geyser on only when needed, LED bulbs, star-rated appliances, switch off at the plug",
      ],
      rubric: [
        "identifies heating or cooling appliances such as AC, geyser or iron as the big consumers",
        "gives at least two practical ways to reduce usage",
        "mentions temperature settings, LED bulbs, star ratings or switching off standby",
      ],
      misconceptions: ["claims LED bulbs or phone chargers are the main cause of a high bill"],
    },
    {
      id: "home-fridge-organise",
      topic: "Kitchen and home",
      prompt: "Where in the fridge should raw meat, dairy, and vegetables go, and why?",
      points: [
        "Raw meat and fish on the bottom shelf so drips cannot fall on other food",
        "Dairy and cooked food on middle shelves where it is coldest and steady",
        "Vegetables in the crisper drawer which keeps humidity",
        "Door is warmest, fine for sauces and drinks, not milk",
      ],
      rubric: [
        "says raw meat or fish goes at the bottom to stop drips contaminating other food",
        "says vegetables go in the crisper drawer",
        "says the door is the warmest part and better for items like sauces or drinks",
      ],
      misconceptions: [],
    },

    // ---------- Staying safe ----------
    {
      id: "safe-otp",
      topic: "Staying safe",
      prompt: "Someone calls claiming to be from your bank and asks for the OTP you just received. What do you do and why?",
      points: [
        "Never share an OTP; banks and companies never ask for it",
        "An OTP received without you initiating anything means someone is trying to use your account",
        "Hang up and call the bank on the number printed on your card",
        "Report the number",
      ],
      rubric: [
        "says never to share the OTP",
        "says a real bank never asks for an OTP over the phone",
        "says to hang up and contact the bank through its official number",
      ],
      misconceptions: ["suggests it is fine to share the OTP if the caller knows your name or account details"],
    },
    {
      id: "safe-phishing",
      topic: "Staying safe",
      prompt: "How can you tell that a message or email is likely a scam?",
      points: [
        "Urgency or threats: account blocked, pay now, KYC expiring today",
        "Asks for money, OTP, password or card details",
        "Links to odd domains or shortened URLs; sender address does not match the company",
        "Too good to be true: prizes, refunds, easy jobs",
        "Spelling mistakes and generic greetings",
      ],
      rubric: [
        "mentions urgency, threats or pressure to act immediately",
        "mentions requests for money, OTP, passwords or card details",
        "mentions suspicious links or sender addresses that do not match the company",
        "mentions offers that are too good to be true",
      ],
      misconceptions: ["claims a message must be genuine if it uses the company's logo or name"],
    },
    {
      id: "safe-password",
      topic: "Staying safe",
      prompt: "What makes a password strong, and why should you not reuse the same one everywhere?",
      points: [
        "Long, ideally 12 or more characters, or a passphrase of several words",
        "Not guessable: no names, birthdays or common words alone",
        "Unique per site: if one site leaks, attackers try the same password everywhere",
        "Use a password manager and two-factor authentication",
      ],
      rubric: [
        "says length matters or suggests a passphrase",
        "says it should not be guessable from personal details or common words",
        "explains that reuse is risky because one leak exposes all accounts",
        "mentions a password manager or two-factor authentication",
      ],
      misconceptions: ["claims replacing letters with symbols like a to @ makes a short password strong"],
    },
    {
      id: "safe-choking",
      topic: "Staying safe",
      prompt: "What should you do if an adult is choking and cannot speak or cough?",
      points: [
        "Give up to five firm back blows between the shoulder blades",
        "Then up to five abdominal thrusts (Heimlich), alternating",
        "Call emergency services if it does not clear",
        "If they can cough, encourage coughing and do not intervene",
      ],
      rubric: [
        "mentions back blows between the shoulder blades",
        "mentions abdominal thrusts or the Heimlich manoeuvre",
        "says to call for emergency help if it does not clear",
      ],
      misconceptions: ["suggests giving the person water or reaching blindly into the throat"],
    },
    {
      id: "safe-burn",
      topic: "Staying safe",
      prompt: "What is the right first aid for a minor burn from a hot pan?",
      points: [
        "Cool under cool running water for 10 to 20 minutes",
        "Remove rings or tight items before swelling",
        "Cover loosely with a clean non-fluffy dressing or cling film",
        "Do not apply ice, butter, toothpaste or oil; do not burst blisters",
      ],
      rubric: [
        "says to cool the burn under cool running water for a long time, around ten to twenty minutes",
        "warns against ice, butter, toothpaste or other home remedies",
        "mentions covering the burn loosely with something clean or not bursting blisters",
      ],
      misconceptions: ["recommends applying ice, toothpaste, butter or oil to the burn"],
    },

    // ---------- The world around us ----------
    {
      id: "world-seasons",
      topic: "The world around us",
      prompt: "Why does the Earth have seasons?",
      points: [
        "The Earth's axis is tilted about 23.5 degrees",
        "As it orbits the Sun, each hemisphere leans toward the Sun for part of the year and away for the rest",
        "Leaning toward means more direct sunlight and longer days, so summer",
        "It is not because the Earth is closer to the Sun in summer",
      ],
      rubric: [
        "says the Earth's axis is tilted",
        "says the tilt makes one hemisphere face the Sun more directly at different times of the year",
        "links more direct sunlight or longer days to summer",
      ],
      misconceptions: ["claims seasons happen because the Earth is closer to the Sun in summer"],
    },
    {
      id: "world-rain",
      topic: "The world around us",
      prompt: "Explain how rain forms, from water on the ground to drops falling from clouds.",
      points: [
        "Sun heats water, it evaporates into vapour",
        "Warm moist air rises and cools; vapour condenses on tiny particles into droplets, forming clouds",
        "Droplets merge until heavy enough to fall as rain",
      ],
      rubric: [
        "mentions evaporation of water by the Sun's heat",
        "says rising air cools and the vapour condenses into droplets or clouds",
        "says droplets combine or grow until they are heavy enough to fall",
      ],
      misconceptions: [],
    },
    {
      id: "world-monsoon",
      topic: "The world around us",
      prompt: "What causes the Indian monsoon?",
      points: [
        "In summer the land heats up much faster than the ocean",
        "Hot air over land rises, creating low pressure that pulls in moist air from the Indian Ocean",
        "The moist winds hit hills such as the Western Ghats and the Himalayas, rise, cool and release rain",
        "In winter the pattern reverses and winds blow from land to sea, so it is dry",
      ],
      rubric: [
        "says land heats faster than the sea in summer",
        "says this creates low pressure that draws in moist winds from the ocean",
        "mentions the winds rising over mountains or cooling to give rain",
      ],
      misconceptions: ["claims the monsoon is caused by the Earth moving closer to the Sun"],
    },
    {
      id: "world-vaccines",
      topic: "The world around us",
      prompt: "How does a vaccine protect you from a disease?",
      points: [
        "It shows the immune system a harmless piece or weakened form of the germ",
        "The body makes antibodies and memory cells without getting sick",
        "If the real germ arrives later, the body recognises it and fights it fast",
        "Widespread vaccination also protects those who cannot be vaccinated (herd immunity)",
      ],
      rubric: [
        "says the vaccine exposes the body to a harmless or weakened form or part of the germ",
        "says the immune system learns or makes antibodies and memory",
        "says the body then responds quickly if the real infection comes",
      ],
      misconceptions: ["claims vaccines give you the full disease"],
    },
    {
      id: "world-recycling",
      topic: "The world around us",
      prompt: "Why should wet and dry waste be separated at home?",
      points: [
        "Wet waste such as food scraps can be composted into manure",
        "Dry waste such as paper, plastic and metal can be recycled only if it is clean and not contaminated by food",
        "Mixed waste ends up in landfills, produces methane and leachate, and is hard to sort",
        "Hazardous items like batteries and medicines need separate disposal",
      ],
      rubric: [
        "says wet or food waste can be composted",
        "says dry waste can be recycled if it is kept clean or separate",
        "mentions a problem with mixed waste such as landfill, pollution or being impossible to sort",
      ],
      misconceptions: ["claims all waste gets sorted properly later so separation at home makes no difference"],
    },
  ],
};
