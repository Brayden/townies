# Townies Gameplay Design

## A persistent neighborhood built by its residents

Townies is a lighthearted multiplayer life simulation where up to 50 residents share a permanent town. You arrive with a modest home and an ordinary job. Your deliveries, clean streets, garden beds, local purchases, and civic choices gradually turn a sleepy settlement into a thriving place that reflects the people who live there.

The core promise is simple: log in, do something satisfying, and leave a small improvement behind. A two minute visit can finish a favor or a school lesson. A two hour session can include work, decorating, a community project, and time with familiar neighbors. Personal ambition and collective prosperity should reinforce each other.

This document defines the proposed full game and the smaller playable version that should prove it. Numerical values are initial playtest settings, not established balance. Townies is the working title. The intended audience is the game’s design, art, and engineering team.

### Design commitments

- A town has 50 resident slots and supports all 50 residents online together. Membership persists between sessions.
- Every useful action has an immediate result, a personal reward, and an understandable connection to the town.
- Players may advance at different speeds. Missed days never erase education, career mastery, possessions, or permanent town upgrades.
- Cooperation improves the experience without requiring appointments, voice chat, a particular profession, or another player’s permission.
- Advanced careers introduce new decisions and expressive tools. Entry level work remains valuable and enjoyable.
- Prosperity brings better services, beautiful public spaces, and new possibilities while preserving the town’s intimate scale.

### What success feels like

“I recognize the person delivering my packages.” “That park opened because we all helped.” “I finally bought a cottage with a workshop.” “I only had a minute, but I planted the last flowers by the school.” These are the stories the systems should make easy to tell.

The visual direction is warm, readable, top down pixel art with expressive characters and inviting interiors. Stardew Valley provides a reference for coziness and legibility; Townies needs its own buildings, silhouettes, palette, interface, characters, and world identity.

## 1 The core play loop

### From noticing a need to seeing a change

The player notices an opportunity in the world or on the town board, chooses a task, performs a short interactive activity, and receives coins and career experience. The completed task changes a real object or service. That result contributes to current town wellbeing or a permanent project. The player then chooses whether to work again, spend, socialize, study, or leave.

A paper route fills visible mailboxes and refreshes the community noticeboard. Street cleaning clears the sidewalk that everyone walks past. A delivery supplies a café order. Each finish gives a modest animation, a concise receipt, and one clear next opportunity. The player does not need to understand the whole economy to enjoy the first job.

### Session sizes

| Available time   | Example activity                                                            | Worthwhile result                                                 |
| ---------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 2 minutes        | Spawn at home, complete a nearby quick task, receive the receipt            | Coins, XP, and one visible neighborhood improvement               |
| 5 to 10 minutes  | Finish a route, attend a lesson, check a project                            | Career progress, education credit, and a choice about town growth |
| 20 to 30 minutes | Complete several varied jobs, shop, decorate, help a neighbor               | A meaningful purchase or a step toward promotion                  |
| 1 to 2 hours     | Work across districts, build a project with others, decorate, join an event | Multiple personal goals and a memorable shared session            |

Quick tasks take 30 to 90 seconds of active play and spawn near homes and public transport. Standard contracts take 3 to 6 minutes. Large assignments take 10 to 15 minutes but contain independently paid steps. A route interrupted after two completed stops keeps those rewards. Inventory and earned progress save continuously; there is no need to walk home before logging out.

### Work should feel like play

Each activity combines easy controls with optional mastery. Deliveries involve choosing a route and landing a forgiving handoff. Mowing leaves satisfying stripes while the player chooses a path around obstacles. Cleaning involves sweeping groups of debris into a collection zone. Café work asks the player to remember a short order and arrange it correctly.

Avoid repeated hold to interact chores as the entire career. Reuse a small set of strong mechanics, then vary layouts, tools, requests, weather effects, and cooperative arrangements. Reward careful completion and clever routing without making precision or speed mandatory. A relaxed control option earns the normal reward; time trials are optional challenges with cosmetic recognition.

### Time and stamina

The shared visual day lasts approximately 48 real minutes and continues while the town is running. Jobs and school remain accessible at night through believable service windows and a lit evening entrance. Players never need everyone to sleep. A personal bed is a rest animation and home activity, not a vote to skip time.

Daily education credits, demand budgets, and elections use a separate real calendar displayed in the interface. The town’s fixed calendar timezone is UTC for public towns; private towns choose one at creation and cannot change it during an election cycle. Visual days do not grant extra daily credits. No stamina system blocks productive play; snacks provide small conveniences and social rituals.

## 2 Town membership and shared presence

### Public and private towns

Choose “Find my town,” “Create a private town,” or “Join with a key.” Public matching considers language, connection region, optional usual play hours, available housing, and established resident count. It fills healthy existing towns before opening another. A new resident receives a permanent town ID; returning to the game loads that same town even if nobody is online.

Private creation offers a town name, a preset landscape, a region, calendar timezone, and a shareable invitation key. Keys are revocable and replaceable. Rotating a key prevents future entry but never removes existing residents. A key grants membership only when a slot and starter home are available. A full town gives a clear explanation; it does not silently place a friend elsewhere.

The 50 person limit applies to resident membership, not just simultaneous connections. This prevents a town from being oversubscribed when everyone logs in. Nonplayer characters do not use resident slots. Cross town visitors are outside the initial scope; if added later, they must not displace residents or gain local voting rights.

### Familiar neighbors

Players see other online residents moving, using tools, carrying deliveries, driving, and entering shared buildings. A small name label appears when nearby or selected. Optional map presence helps friends find one another; privacy settings can hide the exact map location without making an avatar invisible in the shared space.

Homes and occupied lots persist while residents are offline. Offline avatars do not pretend to be active people. A town board remembers contributions through short project updates, so somebody who plays in the morning can see what an evening neighbor helped finish.

Movement should feel immediate. Characters can pass through each other after brief contact, and player vehicles cannot injure, trap, or permanently block anyone. Tool effects cannot damage another person’s possessions. Shared building interiors support simultaneous occupants; private home entry follows the owner’s permissions.

### Sparse towns and absences

NPC shopkeepers, a school tutor, and municipal crews provide essential service baselines. Task demand scales with recent activity instead of assuming 50 daily players. NPC crews keep roads passable and basic services open; they do not earn player rewards or finish prestigious community projects. A lone player can work, study, shop, and contribute without waiting for a specialist.

After 14 days away, a resident receives a friendly recap when they next return. There is no unpaid rent, missed wage debt, or career demotion. A public town stops counting a resident as active for workload scaling after seven days without a completed activity, but the resident keeps their membership and address.

At 60 days of inactivity, a public town marks a resident dormant and offers remaining members an optional plan to welcome replacements. Replacement requires an explicit voluntary departure or an inactivity release policy that the resident accepted at joining. For the first playable version, do not automatically release slots: favor trust and manual support while collecting evidence about abandoned towns. This intentionally leaves automated repopulation unresolved until it can be tested safely.

The proposed later policy sends advance notices, archives the resident’s home layout and belongings without loss, and releases the slot only after the disclosed grace period. Returning players try their original town first; if full, they choose a new town with their personal progression intact. The interface must acknowledge this exception to permanent membership before joining. Private towns retain residents until they leave or an authorized host removes them for moderation.

### Leaving and changing towns

Never rematch automatically on login. A voluntary move previews what travels: career levels, education, coins, movable furniture, and equipment. The old property returns to available inventory and its value is handled through the housing resale rule. Civic office, local votes, project credit, and unique public naming rights remain with the town. Town transfers have a proposed 30 day cooldown and reset local voting eligibility. Initial development can defer transfers while supporting account recovery.

## 3 The first session

### Arrival and career choice

1. Choose a name and character appearance with inclusive, freely editable presentation options.
2. Join a public town or use a private town key. Show resident count, calendar timezone, and community rules.
3. Arrive at the station with an NPC welcome and a quick view of the town’s current state.
4. Choose one of five distinct Tier 1 job offers. Each card shows a brief activity preview, normal pay, town demand, and later career possibilities.
5. Choose an unoccupied starter home from the right hand housing panel.
6. Receive 150 coins, a home key, the job’s basic tool, and one starter furnishing choice.
7. Complete a nearby first task and see exactly what changed. Then freely explore.

The target is a useful first action within five minutes, with appearance choices and dialogue skippable. Explain school, elections, and taxes when they become relevant rather than presenting a wall of tutorials on arrival.

### The home selection camera

Keep a scrollable list of available homes on the right and the live town view on the left. Cards contain a name, exterior thumbnail, district, starter layout, outdoor space, and walking distance to the job board. All starter homes are free and equally functional. Differences concern location and character rather than a hidden best option.

Selecting a card moves the camera toward that house over roughly 0.6 to 0.9 seconds, ending with the roof and entrance clearly framed beside the panel. Highlight the lot boundary and doorway. A second card selection interrupts and redirects the movement smoothly. Offer reduced motion with an immediate cut and highlight. Camera previews never move the player’s avatar or reserve the property.

“Make this my home” requests the home claim. The server checks availability and commits membership, job, and home together before the final welcome. If another player claimed it first, show a friendly notice, refresh the list, and keep the current career choice. Temporary onboarding reservations expire after ten minutes of inactivity and cannot be used to hoard homes.

The map supports at least 50 starter residences through cottages, duplex units, and compact apartments. Each claimed unit has an individual address and door, even when several share a building. Unclaimed residences appear for sale. Later districts add upgrade homes so the first 50 residents do not consume the entire housing ladder.

### Starter homes

| Home           | Character                            | Practical distinction                              |
| -------------- | ------------------------------------ | -------------------------------------------------- |
| Station studio | Brick upstairs room and flower box   | Close to routes and shops                          |
| Courtyard flat | Shared green with a private entrance | Near neighbors and a community garden              |
| Pocket cottage | Small porch and fenced side yard     | Room for outdoor decoration                        |
| Canal duplex   | Painted siding and a narrow patio    | Close to a scenic walking route                    |
| Workshop nook  | Converted outbuilding beside a lane  | Same starter capacity with a craft themed interior |

A starter bike rack, storage access, and a small decoration area are available to every layout. All residents can borrow necessary job equipment regardless of house size. Starter choices can be previewed inside before confirmation.

## 4 Twenty entry level jobs

Five offers provide variety without assigning somebody a role they dislike. Every job uses one of the following families: transport, care of public space, trade and food, community service, or maintenance. The first playable version needs only three jobs; this is the full Tier 1 roster to expand toward.

| Job                     | Main activity                                 | Visible town contribution                   |
| ----------------------- | --------------------------------------------- | ------------------------------------------- |
| Paper carrier           | Toss or hand off papers along a short route   | Updated noticeboards and informed neighbors |
| Street cleaner          | Sweep debris into collection piles            | Clear sidewalks and tidy squares            |
| Delivery driver         | Load parcels and plan a compact route         | Stocked shops and fulfilled orders          |
| Lawn mower              | Cut marked lawns around obstacles             | Trimmed verges and usable greens            |
| Recycling collector     | Sort and collect neighborhood bins            | Recovered material for public crafts        |
| Park attendant          | Tidy benches and refill small amenities       | Welcoming parks and picnic areas            |
| Community gardener      | Plant, water, and harvest shared beds         | Flowers, produce, and greener streets       |
| Tree nursery helper     | Pot saplings and prepare planting orders      | Shade trees for new streets                 |
| Café assistant          | Assemble simple drinks and snacks             | A lively gathering place                    |
| Bakery assistant        | Shape dough and arrange oven batches          | Bread for shops and town events             |
| Grocery stocker         | Match deliveries to shelves                   | Reliable local shopping                     |
| Market stall helper     | Arrange goods and fulfill customer requests   | A busy weekly market                        |
| Library assistant       | Sort returns and organize displays            | Reading clubs and school resources          |
| School aide             | Prepare activity kits and restore classrooms  | Welcoming learning spaces                   |
| Pet shelter helper      | Feed, groom, and enrich NPC pets              | Happy animals and adoption events           |
| Community center helper | Set up tables and activity stations           | Social gatherings and clubs                 |
| Road crew assistant     | Place safe barriers and patch small defects   | Smoother streets and new paths              |
| Handyperson trainee     | Repair public fixtures through simple puzzles | Working lights, benches, and fountains      |
| Window washer           | Clear grime in satisfying swipes              | Bright storefronts and civic buildings      |
| Car wash attendant      | Wash and finish NPC service vehicles          | Clean fleet vehicles and transport pride    |

Animal care never depicts neglect or suffering when players are absent. Food and gardening work produces scheduled orders rather than a hunger system. Road tasks occur in safe marked work zones without injury mechanics.

### Offering jobs fairly

Build the five card offer from two in demand jobs, two broad variety jobs, and one completely random remaining job. Prefer at least three career families. Determine shortage using actual outstanding work and the previous seven days of completed tasks, not how many inactive residents once selected a profession. Use a neutral distribution until the town has enough history.

“Needed in town” gives a modest temporary bonus, initially up to 10 percent, with an expiry shown before acceptance. It never hides normal wages. Demand is recalculated daily and a contract locks its reward when accepted. Repeatedly switching jobs cannot refresh bonuses on already completed work.

Allow one immediate reshuffle during onboarding and a full job catalog at the employment office afterward. Main jobs can be changed freely between assignments; learned XP stays attached to its career track. Only one paid assignment is active at a time. Any resident can take basic volunteer or casual cover tasks, so a town never stalls because its only cleaner is offline.

### Contracts and shared objects

A contract specifies its location, required actions, reward, and estimated time before acceptance. Shared tasks use short renewable claims while someone is actively working. Idle or disconnected claims expire after 60 seconds. Completed steps remain complete. Rewards are written exactly once, even if a connection drops during the finish animation.

Large sites split into small independently claimable sections. Another player can clean the opposite side of a square or join a delivery route without taking the first person’s credit. In a crew, each resident earns for their own contribution and receives an equal small completion bonus if they participated meaningfully. A passerby who arrives for the final second receives only credit for what they actually did.

## 5 Civilian careers and education

### Five tiers with different responsibilities

| Tier | Role in the town              | Unlock and target pace                                       | New play opportunities                                    |
| ---- | ----------------------------- | ------------------------------------------------------------ | --------------------------------------------------------- |
| 1    | Learn a useful trade          | Immediate                                                    | Simple jobs and borrowed tools                            |
| 2    | Become a reliable specialist  | About 10 to 15 standard contracts and a practical assessment | Route choices, better tools, larger assignments           |
| 3    | Qualify for professional work | Tier 2 assessment plus 30 education credits                  | Project plans, specialties, business services             |
| 4    | Become an expert              | About 60 varied Tier 3 contracts and an individual capstone  | Advanced equipment and complex project modules            |
| 5    | Master a vocation             | About 100 varied Tier 4 contracts and a mastery project      | Signature designs, mentoring, and prestigious commissions |

Counts are balancing starting points. Quick tasks award proportional XP; they are not full contract equivalents. Longer work earns proportionally more XP. Assessments are short practical activities with unlimited retries and clear feedback. Promotions never depend on another player approving a candidate, an available management seat, or popularity.

Each tier has a mastery bar. Variety requirements mean practicing distinct mechanics, not visiting on a fixed number of consecutive days. The interface always shows the next promotion requirements and progress. Tier 3 should feel possible after roughly a month of frequent short visits; casual players reach it later without losing anything. Tiers 4 and 5 are longer term goals to calibrate against actual play, not promises of a fixed completion date.

### School over thirty attendance days

The school grants one education credit for completing a 60 to 120 second lesson on each real calendar day. Thirty credits unlock professional qualifications. Attendance is cumulative, never consecutive, and merely opening a door does not count. Each lesson teaches a mechanic, introduces a town system, or presents a small practical puzzle. Present progress as “18 of 30 lessons completed,” with no broken streak punishment.

On enrolment, let the player preview three professional directions and the full later catalog. At graduation, offer three qualified Tier 3 jobs with previews of their Tier 4 and Tier 5 futures. A graduate still begins at Tier 3. A missing employer building does not block the career: the school provides a municipal desk and starter contracts while the town develops the dedicated facility.

The first version uses the straightforward thirty attendance day rule. A later accessibility and schedule experiment can bank up to three missed lessons per week for make up study, but should keep a minimum 30 calendar days since enrolment. This is an alternative to test, not an additional default system. No tuition grind, premium instant graduation, or loss of credits when changing careers.

### Example career ladders

| Career family | Tier 1              | Tier 2                | Tier 3                   | Tier 4                  | Tier 5                      |
| ------------- | ------------------- | --------------------- | ------------------------ | ----------------------- | --------------------------- |
| Transport     | Paper carrier       | Route courier         | Logistics coordinator    | Fleet specialist        | Regional transport planner  |
| Public care   | Street cleaner      | Sanitation specialist | Environmental technician | Sustainability engineer | Civic environment designer  |
| Landscaping   | Lawn mower          | Groundskeeper         | Landscape designer       | Horticulture specialist | Master landscape architect  |
| Food          | Bakery assistant    | Baker                 | Culinary professional    | Executive chef          | Master artisan baker        |
| Construction  | Handyperson trainee | Repair technician     | Building technician      | Restoration specialist  | Master town builder         |
| Community     | Library assistant   | Program assistant     | Educator                 | Learning specialist     | Community learning director |

Titles describe gameplay expertise, not authority over other residents. Multiple people can be town builders or directors. Career families share skills; the Tier 1 roster does not require 20 entirely separate five tier content pipelines. A mower and a gardener can converge on landscaping while retaining different tool preferences.

### Promotion should change the verbs

A new groundskeeper chooses an efficient mowing route. A landscape designer selects a planting plan within a public project footprint, then places its modules. A specialist combines trees, beds, water features, and maintenance access. A master contributes an original arrangement from approved assets to the town’s design catalog. Public installation still follows project permissions.

Higher tiers can keep doing lower tier tasks and earn their usual XP plus the relevant contract pay. Specialized assignments carry a moderate pay premium, initially about 15 percent per tier above Tier 1 for comparable effort, reaching roughly 1.75 times Tier 1 at Tier 5. Prestige and expression should matter more than an enormous income gap. Every tier gets both quick and longer assignments.

### Learning another career

School completion is a permanent general qualification. Changing professions preserves all earlier mastery and can require a short family specific practical course. A player does not repeat thirty days of school for every job. A veteran entering a new family starts at the tier supported by that family’s mastery, with the professional path already visible. No paid respec and no permanent mistaken choice.

## 6 Money and useful ownership

### One currency with three purposes

Coins pay for comfort at home, tools that widen the player’s options, and visible contributions to public life. Keep one main spendable currency. Career XP, education credits, and town development points are progress measures that cannot be traded or purchased. Show gross pay, tax, and take home coins on every work receipt.

Initial prices and payouts should let a new player buy something attractive in the first session, a practical upgrade in the first week, and a larger home after sustained play. Borrowed tools remain capable of completing every required job. Ownership adds convenience, customization, capacity, or access to optional assignments.

### Starting balance model

| Item or activity         | Initial amount                    | Intended purpose                               |
| ------------------------ | --------------------------------- | ---------------------------------------------- |
| Welcome grant            | 150 coins once                    | Buy a small personal item immediately          |
| Tier 1 quick task        | 12 coins gross in about 1 minute  | A useful short visit                           |
| Tier 1 standard contract | 60 coins gross in about 5 minutes | Baseline active earnings                       |
| Default wage tax         | 5 percent                         | Shared treasury contribution                   |
| Small furnishing         | 40 to 120 coins                   | First session expression                       |
| Bicycle                  | 350 coins                         | Early movement convenience                     |
| Personal mower           | 900 coins                         | Ownership and cosmetic customization           |
| Cottage upgrade          | 4,000 coins                       | A substantial personal goal                    |
| Small utility cart       | 5,500 coins                       | Convenient route carrying capacity             |
| Family home with garage  | 12,000 coins                      | Longer term space and expression               |
| Personal tractor         | 18,000 coins                      | Large optional landscaping contracts and pride |

At the default tax rate, a 60 coin contract leaves 57 coins and moves 3 into the treasury. Four contracts yield 228 spendable coins. Ignoring other purchases, a 4,000 coin cottage takes about 71 standard contracts, or roughly six hours of active contract work. Travel and social time lengthen the calendar journey. A two minute player earns more slowly, but can still buy small decorations within a handful of visits.

Use integer subunits internally and a consistent displayed rounding rule so splitting a job cannot avoid tax. The welcome grant is tax exempt and cannot be transferred to another resident. Private gifts and already taxed player sale proceeds are not charged wage tax again. A market listing fee, if enabled, is separately labeled.

### Where coins come from and go

NPC customers and outside trade fund regular job pay. These are deliberate currency sources. Wages must not depend on the mayor preserving a local payroll balance: a town with an empty treasury still has work. The tax portion transfers into the treasury; it is not an extra newly created grant.

NPC shops, home upgrades, optional consumables, customization, and vehicle purchases remove coins from the player economy. Treasury spending removes coins in exchange for permanent public assets. Player trading, gifts, and donations move existing coins and do not remove or create them. Record these flows separately when evaluating inflation.

Avoid passive salary for being logged in, interest on idle balances, mandatory home upkeep, speculative land trading, and profitable buy sell loops with NPC vendors. Sellback values are below purchase prices. Long sessions should remain rewarding; a healthy town shifts spare work toward export orders and optional creative contracts rather than forcing players to wait for litter to return.

### Work demand and inflation controls

An official town task has a finite reward and finite contribution value. Players cannot create litter, damage a fixture, or trade the same parcel repeatedly to manufacture paid work. Demand responds to real town activity and scheduled NPC orders. When a category is fully serviced, the board offers export work with normal income but no extra local prosperity credit.

Track coins created, coins spent, median balances, time to first purchase, and income by career and session length. Adjust future contract values and optional prices in announced balance updates. Do not silently reduce owned wealth or add surprise compulsory bills. A day one event bonus is a modest celebration, not a major economic advantage for residents who can attend.

### Making personal wealth matter to others

A resident can contribute coins or materials to a public project, buy event supplies, loan a tool, commission furniture, or gift a decoration. The project preview shows exactly what a donation buys and whether the project still needs labor. Donation receipts are permanent; declined proposals refund held contributions automatically.

Money cannot replace every construction step or purchase votes. Large donations have capped public development credit and no special voting weight. The town credits both the person who paid for the gazebo and the people who assembled it. Display contributor names without a public wealth ranking, and allow anonymous gifts.

The mature game can add player commissions with payment held until the agreed item is delivered. Early versions should use simple fixed price catalog commissions and no debt, player banking, speculative auction house, or recurring employment contracts. Essential items always have an NPC alternative.

## 7 Housing equipment and neighborhoods

### A home that grows with the resident

Residents own one active home per town. Starter housing is granted without rent. Later choices include a larger flat, cottage, workshop house, family home, and distinctive prestige residence. Every step offers a clear combination of room space, decoration surfaces, garden area, and equipment storage. Housing never determines eligibility for public office or a career.

Upgrading compares the purchase price, automatic trade in credit, available coins, and storage changes before confirmation. The starter home has zero resale credit. Paid properties return a proposed 70 percent of their original purchase price through the town’s housing service, subject to later balance testing. This service is an explicit currency source in the economy model. No bidding wars or player controlled rents in the first release.

The move is one transaction: claim the new address, release the old address, transfer furniture and permissions, and charge the net price. Items that do not fit go into safe home storage. Players preview both exterior and interior, then use a move checklist. A failed connection cannot lose either the payment or the old home.

### Decorations and visitors

Place furniture on a readable grid with optional snap assistance. Recolor items, arrange rooms, plant flowers, and set a short doorstep message. Public silhouettes and doorway access remain within lot rules. Guests can look and use explicitly shared furniture; they cannot rearrange, harvest, take, or sell items unless the owner grants that exact permission.

Provide owner only, invited friends, and town welcome access presets. Permissions default to owner only. A neighbor can ring a bell without demanding attention. Home tours, seasonal decorating prompts, and collaborative garden days create reasons to visit. Likes are optional appreciation rather than a currency or a path to superior housing.

### Equipment as a new possibility

Bikes make local movement pleasant. Mowers offer wider cuts or different handling. Utility carts carry more parcels. Tractors support larger optional landscaping tasks. Cars are slow town scale transport and personal expression; delivery pedestrians remain competitive on short routes. Vehicles have safe recall and cannot block entrances.

Equipment is stored on compatible private pads or in a municipal garage, so small homes can still own it. A shared depot loans functional versions. Upgrades cap their throughput advantage and match players to appropriately sized work: buying a tractor must not let one veteran clear every beginner task. Reusable tools do not break during absence; optional maintenance is a short service interaction with a visible, modest cost.

### Living districts

Start with a station, main square, shops, school, residential lanes, a small park, and a service depot. Keep a common destination within a short walk of each starter home. Later upgrades add a market street, riverside paths, community venues, and specialist work sites. Public transport compresses travel as the map grows.

Preserve recognizable landmarks, addresses, paths, and neighboring relationships when the town upgrades. New development expands reserved parcels and improves existing facades; it does not randomly regenerate the map or displace residents. A fully developed town still looks like the neighborhood where everyone began.

## 8 Town wellbeing and permanent development

### Two connected measures

Current wellbeing answers “How is the town doing lately?” Permanent development answers “What have we built together?” Separate them so missing a few days can mean a weedy park or fewer festival decorations without demolishing the library or downgrading homes.

Wellbeing has five visible categories: cleanliness, greenery, services, commerce, and community. Each uses a 0 to 100 score derived from the proportion of legitimate recent demand fulfilled, smoothed over a rolling seven day window. Initially weight the categories equally. The overall prosperity display is their average, accompanied by plain language examples and useful next actions.

NPC baseline care keeps each category at or above 40. At no recorded demand, a category rests at the baseline rather than receiving perfect credit. New towns start at 50 with a short learning grace period. Scores affect atmosphere, optional event variety, and visitor activity, not access to wages, housing, school, or basic shops. Avoid a compounding wage bonus that makes already rich towns economically dominant.

### Demand that fits the community

Generate category targets from residents who completed meaningful activity in the previous seven days, with smoothing and a small minimum suitable for one to five people. Grow targets gradually when a large friend group joins, and lower them gradually when activity falls. Publish the next weekly target before it takes effect. Logging in without playing does not inflate everyone’s workload.

Each genuine task can earn local wellbeing credit only once. Daily category credit is bounded by its demand target; further work still earns normal pay through exports or personal commissions. Residents can see underserved areas without being told which named neighbor failed to contribute. Donating coins does not directly raise cleanliness or services.

### Permanent town stages

Development points come from first time public project milestones, verified project labor, and varied local work. Initially award one point per standard contract equivalent, including proportionally credited quick tasks and project labor, with a cap of 20 points per resident each week. Each completed public project adds a separate one time 50 point town bonus. Do not award both ordinary work credit and labor credit for the same action. Income and career XP continue after the personal development cap. This limits the ability of one marathon player to decide the entire town’s pace.

| Stage              | Visible identity                             | Example unlocks                                          | Initial cumulative gate                             |
| ------------------ | -------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------- |
| 1 Settling In      | Modest square and simple lanes               | Starter homes, basic school, depot, essential shops      | New town                                            |
| 2 Finding Its Feet | Better paths and bright public planting      | Park restoration, market stalls, bike racks              | 600 development points and 2 projects               |
| 3 Flourishing      | Active main street and distinctive districts | Library expansion, professional facilities, larger homes | 2,000 points and 5 projects across 3 categories     |
| 4 Thriving         | Connected neighborhoods and civic landmarks  | Transit loop, cultural hall, advanced equipment depot    | 5,000 points and 10 projects across all categories  |
| 5 Beloved Hometown | A mature town with its own character         | Signature landmark, festivals, prestige renovations      | 10,000 points and 18 projects across all categories |

The listed point gates are reference values for a town with roughly 20 weekly active residents. At the start of a stage, scale its additional point requirement and future project labor to the recent active population, bounded initially between 0.35 and 2.0 times the reference. Lock that stage’s requirements once work begins; departures cannot instantly discount a nearly complete upgrade. Small town pacing should be tested over simulated weeks before adopting these numbers.

Stage 2 should be achievable in the first week of a reasonably active community; Stage 3 over several weeks; the later stages over months. Project count and category breadth stay visible requirements. Wellbeing can guide project priorities without becoming a brittle extra gate that demands everyone log in on the same day. Completed stages never reverse.

### Projects as cooperative stories

Each public project proceeds through proposal, funding, preparation, construction, and opening. A preview shows the exact site, before and after view, cost, work requirements, expected effects, and any future upkeep. Funding and labor are distinct: a wealthy resident can help finance a park, but workers still create it.

Break construction into many brief tasks across several career families. The park needs deliveries, repairs, planting, cleaning, and event setup. All residents can complete general helper steps. Specialist participation offers alternative designs and efficiency, never an irreplaceable key. A project cannot wait forever for one Tier 5 professional.

An example Stage 2 park costs 2,000 treasury coins and 60 short labor units in a reference town. The board accepts staged deposits and shows funded milestones. Twenty residents averaging 120 gross coins per active day generate 120 tax coins per day at 5 percent, so taxes alone take about 17 such days to cover this park. A one time 1,500 coin founding grant plus those taxes permits the first project much sooner. This arithmetic makes the early grant and affordable smaller projects necessary.

Include 300 to 700 coin starter projects, such as racks, planters, and a repaired fountain, alongside larger goals. Grant money is restricted to starter public projects and cannot become player wages or private gifts. After opening, the town board records the result and everyone receives access; participation earns a small commemorative cosmetic, available through later upkeep work too.

### Long term town identity

At major milestones choose between equally useful expressions: a botanical park or a sports green, a riverside market or an arts courtyard. Show tradeoffs without making one objectively required for earnings. Later renovations can change the choice through another project while preserving achievement history. No choice permanently excludes a resident from a career.

At Stage 5, shift to renovation themes, seasonal celebrations, collections, mentoring, and new public designs. Do not require a seasonal wipe. Record the town’s first opening ceremony, past mayors, and favorite communal moments in a scrapbook. Progress should produce memories as well as larger numbers.

## 9 Multiplayer that brings people back

### Shared usefulness and recognizable routines

Persistent residency lets small encounters build familiarity. A café is useful to a baker, a delivery driver, a customer, and somebody checking the noticeboard. Place practical destinations together so people cross paths naturally. Leave space around counters and squares for spontaneous conversation without blocking work.

Use light task dependencies with substitutes. A baker can supply snacks for a gardener’s event; if unavailable, an NPC vendor covers the order at the standard price. Player participation adds personality, custom options, and recognition. It never leaves somebody unable to play because another person did not log in.

### Synchronous and asynchronous cooperation

An impromptu crew can invite nearby residents to a route or project, show each person’s task, and disband without penalty. Shared carry animations and tandem planting create playful moments. Crew speed helps finish a larger site, while individual contribution accounting prevents reward theft.

Asynchronous requests use a town board with delivery lockers and saved progress. “We need twelve flower trays” remains useful across timezones. Completing a request leaves a short system generated note naming the contribution if the player allows it. No persistent inbox pressure or requirement to respond to every favor.

### Recurring social activities

| Activity             | Short visit role            | Longer session role                   | Reward                                  |
| -------------------- | --------------------------- | ------------------------------------- | --------------------------------------- |
| Weekly market        | Deliver one order or browse | Run a stall and explore commissions   | Earnings, recipes, neighborhood contact |
| Park day             | Plant one bed               | Coordinate a district cleanup         | Public improvement and keepsake         |
| Neighborhood potluck | Bring a snack               | Decorate and host                     | Social emotes and scrapbook entry       |
| Town fair            | Try one minigame            | Organize booths and play with friends | Cosmetics and shared celebration        |
| Home open house      | Visit one room              | Host or decorate with invited friends | Inspiration and optional appreciation   |

Offer events across broad multi day windows and repeat small activities at different hours. The opening of a building is saved as a replayable vignette so offline contributors can enjoy the moment later. Limited themes can rotate back; essential equipment and promotions never require a one time event.

### Reasons to return without obligation

The return invitation is curiosity: what changed, who is around, what can I afford, and which idea can we build next? Show a concise recap with at most three meaningful changes, one personal goal, and one optional town need. Let residents pin their own goals. End sessions with a clear receipt such as “You earned 57 coins, reached Landscaping 2, and finished the west flower bed.”

Avoid login streak multipliers, public attendance rankings, expiring wages, paid energy, and notifications that shame absences. Notifications are opt in and limited to meaningful events selected by the player. Recognition celebrates different roles through rotating stories rather than one total contribution leaderboard.

### Making newcomers feel needed

Reserve a portion of suitable low tier work for new residents and generate demand near their homes. Give each new resident a small welcome project whose result stays in the world. Veteran mentoring rewards a completed practical lesson once per learner, with caps to prevent farming alternate accounts. Beginners can learn from the NPC tutor with identical qualification progress.

An advanced town still offers every starter career and attainable housing. Veterans can donate to a public tool library and request general helper work, but cannot set entry requirements or monopolize job postings. The best endgame resident makes the town more welcoming.

## 10 Mayors elections and public money

### A monthly civic rhythm

Use calendar months rather than calling the cycle exactly thirty days. In months with 30 or 31 days, election activities run from the 21st through the 30th. In February, they run from the 21st through the final day. The 31st, where present, is a results and handover day. The new mayor takes office on the first day of the following month and serves until that month ends.

Within the election window, the first three days are nomination and campaigning days; voting opens on the 24th and closes at 23:59:59 on the final election day in the town timezone. Campaign profiles remain available while voting is open. The current mayor remains responsible until handover. For example, September nominations open September 21, ballots run September 24 to 30, and the winner starts October 1. In a 28 day February, ballots run February 24 to 28.

For a newly founded town, an NPC clerk manages the initial budget until its first complete nomination window. Towns founded after the 21st wait for the following month’s window. The clerk can execute affordable projects from resident priorities, so a town does not stop growing while waiting for an election.

### Candidacy and voting

Running is voluntary and costs no coins. A proposed candidate eligibility rule is seven days of residence and five completed activities on at least two real dates, satisfied when nominations close. Tier, school attendance, home value, wealth, and popularity do not affect eligibility. Residents may nominate only themselves.

Voters must have joined at least 72 hours before nominations opened and completed one genuine activity before that opening. Freeze the eligible voter roll on the 21st. This prevents last minute arrivals from changing an active election while allowing casual residents to participate. One account has one resident identity and one ballot in its town. Account integrity measures need testing; they are not a claim that all alternate accounts can be detected.

Each candidate gets the same profile space, three proposed priorities, a simple budget preview, and the same allotment of in game posters in designated locations. No paid reach, vote buying mechanic, targeted spam, or campaign benefits tied to wealth. Players may discuss ideas through moderated town channels and asynchronous questions.

Use a simple private ballot selecting one candidate or “clerk caretaker.” A player can revise a ballot until voting closes; only the final selection counts. Results show aggregate totals after closing, never individual choices. Highest total wins if turnout reaches the greater of three voters or 20 percent of the eligible roll, capped at the size of that roll. If the roll has zero voters, the clerk remains caretaker.

Ties go to a clearly disclosed auditable random draw among tied leaders at closing, avoiding an additional attendance window. An uncontested candidate still needs more votes than the caretaker option and the turnout requirement. If no candidate qualifies, nobody runs, turnout is insufficient, or the caretaker wins, the clerk administers the next term. If a tiny private town wants a host appointed caretaker, it must select that separate mode before its first election and label the town accordingly.

### What the mayor can do

The mayor chooses public projects from an unlocked catalog, prioritizes district improvements, schedules broad event windows, and proposes changes to the local wage tax within 3 to 8 percent. A mayor can consult residents through polls, neighborhood suggestions, and public budget notes. Every treasury transaction has a public receipt with price, purpose, time, and approving authority.

Routine discretion should be real but bounded. Each term, allocate 20 percent of opening uncommitted funds plus 20 percent of incoming unrestricted tax revenue to a discretionary allowance. The mayor can use that allowance on small approved catalog improvements without a binding vote. Spending never exceeds the actual available balance after existing project commitments and the operating reserve.

Larger projects, tax changes, and landmark redesigns require a 72 hour resident vote. For each proposal, freeze a civic voter roll of residents who joined at least 72 hours earlier and completed one activity before the proposal opened. One account has one vote; a simple majority of votes cast passes if participation reaches the same turnout threshold used for elections. A tie or insufficient turnout leaves the proposal unchanged. Limit the town to one binding spending proposal at a time and show its effect on available funds before voting. Approved tax changes begin at the next daily boundary and affect only newly accepted contracts.

Reserve 20 percent of unrestricted treasury funds for any disclosed public operating costs. Early projects should have no mandatory monetary upkeep so the first economy stays understandable. If upkeep is introduced later, show its weekly cost before approval and cap aggregate obligations to sustainable recurring income. No treasury debt, personal withdrawals, player wage setting, property seizure, or mayor controlled moderation.

### Continuity and accountability

An approved project commits its required funds immediately; another action cannot spend them again. Partial donations are held for that named proposal. If a proposal is declined or expires before approval, refund donors. Once construction starts, cancellation follows a published salvage schedule and cannot enrich the mayor. Permanent upgrades cannot be demolished on a whim.

Mayoral inactivity for seven days enables the clerk to carry out already approved plans, while the mayor retains the office until the next election. Resignation or loss of membership transfers administration to the clerk for the remaining term. Support a recall after seven days in office when at least 30 percent of the eligible roll, with a minimum of three capped at roll size, signs a private petition. A 72 hour vote removes the mayor only when more than half of the entire eligible roll votes to remove. Limit recalls to one per term.

A private host can rotate invitation keys and address conduct under published moderation rules. Hosting does not grant extra votes, treasury access, or control of the mayor. Removal during an election requires a moderation reason in the audit trail and a support appeal route; it cannot automatically erase already valid ballots. Wealth and civic authority remain separate.

## 11 Friendly interaction and access

Provide proximity text, town chat, private messages from accepted contacts, emotes, and contextual “Thanks,” “Need a hand,” and “Joining in” signals. Let players mute chat entirely and still complete every system. Voice is optional future scope rather than a requirement. Report and block tools are available from the resident card; blocking hides communication and invitations while preserving shared world consistency.

Use clear permission boundaries for homes, equipment loans, shared building tools, and public installations. A loan records owner, borrower, and return time; ownership never changes accidentally. Recalling a loan safely ends use and puts the item in storage. Public edits are catalog based until moderation and undo tools can support broader expression.

Support remappable controls, controller navigation, scalable interface text, high contrast task outlines, distinct shapes in addition to colors, reduced motion, and relaxed timing. Pixel art world rendering can remain crisp while text uses an accessible interface font. Essential information is conveyed visually and textually as well as through audio.

Keep tone kind and mildly silly: a runaway wheelbarrow, a delivery to the wrong garden gnome, a mayor opening a very small fountain with a very large ribbon. Challenges are inconvenience and mess, not violent threats or humiliation. Avoid punitive bodily needs, crime systems, combat, and compulsory romantic relationships in the initial vision.

## 12 Example resident and town journeys

### The first week

On day one, Mina joins a public town, chooses lawn mowing from five offers, previews three houses with the camera, and selects a courtyard flat. Her first lawn takes a minute. She earns 12 coins gross, sees tidy grass beside a neighbor’s door, and buys a flowerpot using her welcome grant. She enrolls in school and completes lesson one.

During three short visits she finishes small nearby jobs and takes more lessons. During one longer evening she meets a delivery driver, helps unload planters, and buys a bicycle. Her career bar and education count remain separate. She can see the park proposal before it is funded and donate 20 coins if she wants, but saving for her own mower is equally valid.

### The first months

After mastering basic routes, Mina passes the Tier 2 practical assessment. After thirty credited school days she qualifies for Tier 3 and chooses landscape design. She creates planting arrangements, buys a cottage, and stores larger equipment at the municipal garage. She still mows an occasional quick lawn because it is relaxing.

Meanwhile the town completes starter improvements, opens the park, and chooses a market courtyard for the next district. Its first mayor publishes a budget proposal. Mina votes in under a minute and helps place benches on another visit. Later she may run for office, become a master landscaper, collect unusual furniture, or simply keep her favorite corner of town beautiful.

### Two hours with friends

Four residents log in after dinner. They take ten minutes of individual jobs, pool part of their income toward an approved garden project, and spend twenty minutes delivering, assembling, and planting its sections. Two leave after the first milestone with all progress saved. The remaining pair attend a market event, tour a renovated home, and return to decorate their own places. Nobody must stay until the project is finished to receive credit.

### Coming back after a month

Mina returns to the same house and career with no debt. The recap shows a new library wing, the current mayor, and a friend’s garden project. She can replay the opening vignette, complete one quick task, and resume school at her previous count if still studying. Some shrubs need attention, but no screen says the town suffered because she was away.

## 13 Scope and the path to a playable game

### The first playable promise

Build one small shared neighborhood in which two people can join the same persistent town, select different homes, see one another move, complete a satisfying job, earn saved income, and jointly open one visible improvement. Then prove the same rules work with 50 concurrent residents. This establishes the emotional and technical foundation before twenty careers, elections, or a large economy multiply the surface area.

Use the full design as a destination. A first prototype is not expected to contain all of it. Keep server identity, reliable ownership, persistent rewards, and visible shared changes foundational, because replacing them later would alter almost every feature.

### Phase sequence and completion gates

| Phase                      | Build and evaluate                                                                    | Completion gate                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1 Design and concept art   | Town view, resident scale, house picker, work interactions, town stages               | Agree on one coherent visual direction and a readable first session                            |
| 2 Local playable loop      | Movement, collision, camera, one job, one home, one purchase                          | A new player finishes useful work within five minutes and wants a second task                  |
| 3 Persistent multiplayer   | Accounts, fixed town membership, private keys, live movement, saved homes and rewards | Two real clients reconnect to the same town with correct state and see each other’s actions    |
| 4 Cooperative slice        | Three jobs, ten homes, taxes, one public project, shared board                        | A group completes a lasting improvement across separate sessions without support intervention  |
| 5 Fifty resident alpha     | Fifty home slots, matching, full concurrency, quiet town behavior, abuse controls     | Fifty connected clients work together without duplicate claims, reward loss, or blocked entry  |
| 6 Progression beta         | All Tier 1 roles, Tier 2 and 3 paths, school, home upgrades, more projects            | Several weeks of play show useful short sessions and a stable, understandable economy          |
| 7 Civic and long term beta | Elections, budget votes, Tier 4 and 5, mature stages, events                          | Calendar edge cases and full civic cycles pass; residents understand how to affect town growth |

The three slice jobs should be paper carrier, street cleaner, and lawn mower. They test routing, object state, and continuous tool use without requiring a full vehicle simulation. The initial shared project is a pocket park with delivery, cleaning, and planting helper steps available to everyone.

### Explicitly deferred

Cross town visits, land speculation, player landlords, freeform public construction, deep farming, pets owned by players, open voice chat, mobile native clients, complex business payroll, and unlimited crafting trees are outside the first slice. The twenty job catalog can share mechanics and career families; it does not justify building twenty unrelated minigames before proving three enjoyable ones.

Monetization remains a separate later decision. Prototype progression assumes no paid shortcuts, premium currency, loot boxes, energy purchases, or paid election advantages. Do not use future monetization assumptions to balance the initial economy.

## 14 Engineering loop and reliability

### A repeatable development cycle

For each increment, name the smallest player outcome, specify its visible acceptance conditions, build the simplest complete path, test with multiple clients, watch a short play session, record problems, and revise. Prioritize confusing or unsatisfying interactions before adding more content. Keep a change log of balance hypotheses and test results so invented numbers do not become unquestioned rules.

Use short scenario based playtests: “join your friend,” “claim the house you prefer,” “earn and spend 60 coins,” “help finish a park,” and “return after disconnecting during a task.” Observe whether players can succeed without a spoken explanation. Gather enjoyment and clarity feedback as well as completion time.

### Persistent world rules

The server is authoritative for town membership, housing ownership, task claims, completed work, inventories, coins, school credits, project progress, and ballots. Clients submit intended actions; they do not decide payouts or invent inventory. A player’s town is a durable logical world, not a promise to keep one physical machine running forever.

Use unique identifiers and atomic transactions for home selection, purchases, task rewards, and votes. Retry operations with the same action identifier after reconnecting so a repeated message cannot duplicate a payment. Track meaningful economic and civic actions in an auditable ledger. Back up world state and rehearse recovery before inviting a durable community.

World objects distinguish appearance from ownership and durable state. A cleaned path, planted bed, occupied home, and opened park have shared persistent records. Animation and interpolation make motion smooth while the server validates speed, position, interaction distance, and permissions. Loading a town gets a consistent snapshot followed by ordered updates; reconnecting reconciles missed events.

When the last resident leaves, the world can pause visual simulation and resume from elapsed time rules. Bound any catch up decay; never simulate weeks of accumulating garbage on return. Background calendar services still close votes, roll daily credits, and handle approved project state. Dates use authoritative server time and the stored town timezone.

### Tests that earn a multiplayer release

- Two residents attempt the same home or task at the same moment; ownership and rewards remain correct.
- A player disconnects before, during, and after payment; reconnecting produces one correct result.
- A private key is rotated, a town is full, and an onboarding reservation expires; each case has a clear recovery path.
- Fifty clients move, work, join interiors, and reconnect in one town; visibility and interaction remain usable.
- Simulated delayed and reordered messages do not duplicate actions or allow impossible movement and rewards.
- Calendar tests cover February 28 and 29, thirty and thirty one day months, timezones, boundary timestamps, and delayed job execution.
- Long simulations cover one, five, twenty, and fifty active residents, a month of inactivity, income accumulation, spending, and career shortages.
- A mayor leaves, an election has no candidates, a vote ties, turnout fails, and two spending requests compete for the same funds; each resolves predictably.
- Restoration from backup preserves committed purchases and identifies any recovery window explicitly.

Initial performance targets, to validate rather than promise, are 60 frames per second on the agreed reference desktop, town entry within ten seconds on a normal connection, immediate local movement feedback, and interaction acknowledgment usually within 300 milliseconds in the selected region. Test at 50 clients for at least two hours and include a 24 hour automated persistence soak before the alpha gate. Establish actual hardware, latency assumptions, and operating costs during engineering selection.

### Technology decisions to make after the visual slice

Select the client engine after testing crisp pixel scaling, map rendering, tool interactions, camera transitions, and the intended distribution platform. Evaluate the multiplayer stack against authoritative sessions, durable storage, account support, reconnect behavior, and operating effort. Do not choose a stack solely because a single local scene was easy to build.

The design assumes desktop first controls, one logical region per town, and a separable game service and persistent database. These are starting constraints, not a final architecture. Platform support, hosting budget, account model, moderation staffing, and backup objectives need concrete decisions before a public test. No infrastructure or deployment is created by this design phase.

## 15 Playtest questions and measures

The first question is whether ordinary work feels satisfying enough to repeat. The second is whether seeing a shared result makes it more meaningful. Measure retention as evidence of enjoyment and belonging, alongside frustration, obligation, and reasons for leaving. Time spent alone is not success.

| Question                       | Evidence to collect                                           | Initial test target                                              |
| ------------------------------ | ------------------------------------------------------------- | ---------------------------------------------------------------- |
| Does onboarding work           | Time to first useful completed task and where people stop     | Most new testers finish within five minutes without help         |
| Is a tiny session meaningful   | Two minute scenario completion and immediate interview        | At least 80 percent finish and can explain their contribution    |
| Are three jobs fun             | Voluntary replay choice and comparisons at similar rewards    | Players choose each job for reasons beyond pay                   |
| Does cooperation matter        | Shared project participation and recollection                 | Testers can name a contribution by someone else                  |
| Does progression feel fair     | Time to first purchase and promotion by session size          | No career becomes a mandatory income choice                      |
| Can quiet towns function       | Sessions with one to five active residents                    | No required task waits for another player                        |
| Is the economy legible         | Player explanation of pay, taxes, prices, and public spending | Most testers can trace one payout into personal and town funds   |
| Are civic choices usable       | Understanding of proposals, eligibility, and results          | Residents cast a ballot and explain its effect without help      |
| Does persistence deserve trust | Audit of retries, reconnects, and recovery                    | Zero known duplicate rewards or lost committed ownership changes |

These are proposed acceptance criteria, not measured findings. Segment observations by new and veteran players, short and long visits, public and private towns, and low and high activity. Watch for a small group doing all civic work, repetitive task fatigue, social exclusion, or pressure to log in. Revise the responsible mechanic rather than adding larger rewards to conceal the problem.

## 16 Concept art brief for the next phase

### The world and its inhabitants

Explore an original top down pixel art town with warm masonry, painted timber, colorful front doors, readable garden boundaries, varied rooflines, and expressive work props. Streets should feel cared for and lived in, with useful visual distinctions between clean and untended spaces. Avoid extreme deterioration; even a quiet town remains inviting.

Begin by testing a 16 pixel tile unit with residents around 24 to 32 pixels tall, then compare a denser alternative at the same on screen size. This is an exploration target, not a locked production grid. The style must support visible tools, approachable faces, and clear interaction objects without relying on tiny text. Keep interface text separate from the pixel art world.

### The first six visual studies

1. A readable gameplay view of the starter square with several residents working and chatting, showing actual camera scale.
2. The home selection screen with the right hand available homes panel and a highlighted cottage in the live map.
3. A character and tool lineup for all twenty starter jobs, using silhouettes and props instead of uniform swaps alone.
4. The same street at town Stages 1, 3, and 5, preserving its landmarks while showing development.
5. A starter interior and an upgraded home with plausible furniture placement and equipment storage.
6. A cooperative park project shown before work, during construction, and after a community opening.

After selecting a direction, produce a small production test sheet: ground tiles, edges, doors, one building, one character walk cycle, one tool action, and interface states. A beautiful illustration is not yet a usable sprite sheet. Check pixel alignment, readability at gameplay zoom, animation consistency, palette contrast, and how fifty residents can remain legible in a crowded square.

The next deliverable is this concept art exploration. Once the direction is selected, the engineering loop begins with movement, the home camera, and one satisfying job, followed by the persistent cooperative town.
