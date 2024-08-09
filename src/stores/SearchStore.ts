import {action, computed, makeObservable, observable, runInAction, toJS} from "mobx";
import {DataFrame} from "@src/stores/DataFrame";
import {createContext} from "@src/util/react-context-builder";
import {webSearchDDG} from "@src/util/web-search";
import {distillWebpage, html2markdown, scrape} from "@src/util/scrape";
import {makeSummaryWebLLM} from "@src/util/webllm";
import {Readability} from "@mozilla/readability";

class SearchStore extends DataFrame<{
  searchResultsUrls: string[],
  markdowns: string[],
  summaryRaw: string
}> {

  @observable
  // query = "what happened to the market on monday?";
  query = "";

  @observable
  searchResultsUrls: string[] = [];

  @observable
  scrapedSites: { url: string, html: string, parsed: ReturnType<Readability['parse']> | null }[] = [];

  @observable
  markdowns: string[] = [];

  @observable
  summaryRaw: string = '';

  @observable
  statusText: string | null = null;

  @observable
  summaryInProgress = false;

  @computed
  get summary() {
    let summary = this.summaryRaw.trim();

    const usedSources: {url: string, title: string, icon: string}[] = [];

    for(let i = 0; i < this.markdowns.length; i++) {
      if (summary.indexOf(`[source ${i + 1}]`) === -1) {
        continue;
      }
      const sourceURL = this.searchResultsUrls[i];
      usedSources.push({
        url: sourceURL,
        title: this.scrapedSites[i].parsed.title,
        icon: `https://www.google.com/s2/favicons?domain=${new URL(sourceURL).host}&sz=64`
      });

      summary = summary.replace(
        new RegExp(`(?:\\[|\\<)source\\s?${i + 1}(?:\\]|\\>)`, 'gi'),
        `[\\[${usedSources.length}\\]](${sourceURL})`
      );
    }

    return {text: summary, usedSources};
  }

  constructor() {
    super();
    makeObservable(this);

    // @ts-ignore
    window.search = this;
  }

  @action
  setQuery(query: string) {
    this.query = query
  }

  protected async fetch() {

    try {
      console.log('fetching', this.query);

      runInAction(() => {
        this.summaryRaw = '';
        this.searchResultsUrls = [];
        this.markdowns = [];
        this.scrapedSites = [];

        this.statusText = 'Searching ...';
      });

      await new Promise(_ => setTimeout(_, 1000));

      const searchResults = await webSearchDDG(this.query);

      // mock data
      // const searchResults = {results: [
      //     {url: "https://www.allrecipes.com/article/how-to-boil-an-egg/"},
      //     {url: "https://www.recipetineats.com/how-to-boil-eggs/"},
      //     {url: "https://www.loveandlemons.com/how-to-make-hard-boiled-eggs/"},
      //   ] as any[]};

      runInAction(() => {
        this.searchResultsUrls = searchResults.results.map(result => result.url);
      });
      const candidateUrls = searchResults.results.map(result => result.url).slice(0, 5);

      console.log('scraping', candidateUrls);
      runInAction(() => {
        this.statusText = 'Fetching websites ...';
      });

      const scrapedSites = (await Promise.all(candidateUrls.map(scrape)))
        .map(((x, i) => [candidateUrls[i], x] as const))
        .filter(([_, x]) => x.trim())
        .map(([url, html]) => {
          try {
            return {url, html, parsed: distillWebpage(html)};
          } catch (e) {
            console.error(e);
            return {url, html, parsed: null};
          }
        })
        .filter(({parsed}) => !!parsed)
        .sort((a, b) => a.parsed.content.length - b.parsed.content.length)
        .slice(0, 3);

      if (scrapedSites.length === 0) {
        throw new Error('No content found');
      }

      runInAction(() => {
        this.scrapedSites = scrapedSites;
      })

      const markdowns = scrapedSites.map(x => x.parsed).map(x => html2markdown(`<title>${x.title}</title>\n${x.content}`));

      // mock data
      // const markdowns = ["How to Boil Eggs Perfectly Every Time \n\n What's a perfect boiled egg? The whites are firm but not rubbery and the yolks are cooked but still creamy. We'll share a fool-proof method to boil eggs on the stovetop, including how long to boil eggs so the yolks are cooked the way you like. Stick around and we'll show you a couple more ways to cook eggs in the shell: in the oven and in a pressure cooker or Instant Pot.\n\n**Note:** Very fresh eggs are delicious fried or scrambled, but **older eggs are actually easier to peel**. Your best bet for hard-boiled eggs that are easy to peel is to choose eggs you've had in the refrigerator for a week or two.\n\n##  How to Boil Eggs on the Stovetop \n\n There are two egg-related questions that come up all the time:\n\n1. What came first, the chicken or the egg?\n2. Do you start with boiling water or do you start with cold water when you boil eggs?\n\n We recommend a 4-step method that starts with cold water. Why? Because this prevents overcooking the eggs. You'll never have to deal with dry, chalky, overcooked eggs with weirdly greenish yolks again. Nothing but beautiful bright yellow yolks and amazing texture for you! So good, you'll want to eat them with just a sprinkle of salt.\n\n###  Three Steps to Perfect Hard Boiled or Soft Boiled Eggs: \n\n****1\\. Place eggs in a saucepan or pot and cover with cold water.** \n\n Eggs first, then water. Why? Because if you put the eggs in afterward, they might crack as they fall to the bottom of the pan. It's no fun to learn this the hard way.\n\n****2\\. Put pan over high heat and bring water to a rolling boil. Remove pan from heat and cover.** \n\n How long does it take to boil an egg? Well, actually, you want the water to come _just to a boil_ but not stay there. Eggs exposed to high heat for a long time go through a chemical reaction that turns the yolks green. So the answer to \"How long do you boil hard boiled eggs?\" is: pretty much not at all. Because the eggs cook in water that's not actually boiling, some people use the term \"hard-cooked\" instead of \"hard-boiled\" eggs.\n\n****3\\. Drain eggs immediately and put in a bowl filled with water and ice cubes.** \n\n Why ice water? It cools the eggs down and prevents the green yolk problem. (Chilled water isn't cold enough — you want cold water with lots of ice cubes floating in it.) If you're planning to peel the eggs, crack them slightly before putting them in the ice water and let them sit for an hour for maximum ease of peeling.\n\n##  How Long to Boil Eggs \n\n13-smile/Getty Images \n\n Let the eggs stand in the hot water for 4 to 12 minutes, depending on how firm or set you want the yolks to be.\n\n Why the time range? The longer the eggs sit in hot water the more cooked the yolk will be: figure less time for soft boiled eggs and longer time for hard boiled eggs. Use these time guidelines for large eggs:\n\n| **Boiling Time** | **Egg Yolks** | **Egg Whites** |\n| ---------------- | ------------- | -------------- |\n| 2-4 minutes      | Soft, runny   | Soft, runny    |\n| 6-8 minutes      | Soft but set  | Firm           |\n| 10-15 minutes    | Fully set     | Fully set      |\n\n Smaller eggs will need less time and extra-large or jumbo eggs will need more time.\n\n##  How to Hard Cook Eggs in the Oven \n\n This method is just a bit unorthodox. It requires zero water — which, technically makes this method more hard-_baking_ than hard-_boiling_. But stay with us here. Oven-baked \"hard-boiled\" eggs are just eggs heated up in a hot, dry oven. It's a smart move when you're making loads of eggs or stovetop space is at a premium. **Tip:** Use a muffin tin to keep the eggs from rolling about in the oven. Here's the technique in action:\n\n##  How to Cook Hard Boiled Eggs in the Pressure Cooker \n\n Here's the best way to hard boil fresh eggs. Fresh eggs are notoriously hard to peel. But  makes it easy. Allrecipes home cook Gremolata, who submitted the recipes, says: \"If you happen to raise your own chickens or have access to really fresh eggs, a pressure cooker is the best way to make hard-cooked eggs. It doesn't really save time (the pressure cooker's usual claim to fame), but it actually makes fresh eggs easy to peel!\"\n\n**More**: \n\n##  Ways to Use Boiled Eggs \n\n And here's a cheat sheet full of tasty tricks for enjoying hard-boiled eggs sliced into soups, layered into sandwiches, blended into salad dressing, paired up with potatoes, and perfectly !\n\n Store any remaining hard-boiled eggs in the refrigerator in a covered container — the lid prevents odors from getting out into the fridge.\n\n##  How to Store Hard Boiled Eggs \n\n Store hard boiled eggs in their shell in the fridge for up to one week. The shell will help prevent the cooked white from absorbing fridge smells.\n\n If you've already peeled the hard boiled eggs, you can store them in an air-tight container with a damp paper towel for up to one week. Refresh the damp towel daily.\n\n##  How Long Do Hard Boiled Eggs Last in the Fridge? \n\n Stored properly in the refrigerator, you can keep hard boiled eggs for one week — 7 days. For best results, keep your boiled eggs in their shells until you're ready to eat them.\n\n Discover , including nutrition and safety tips, additional cooking methods, , and more.\n\nWas this page helpful?\n\nThanks for your feedback! \n\nTell us why!","How to boil eggs \n\nHow to boil eggs – Bring water to a boil first, add eggs, start the timer. 6 minutes for runny yolks, 8 minutes for soft boiled (my go-to!), 10 minutes for hard boiled. Peel under water to make life easier.\n\nAfter cramming directions for how to boil eggs in the notes of more recipes than I can count, I figured it was high time to share a proper recipe. So here is how I boil eggs!\n\nThis method will produce consistent results to the level of doneness you desire no matter what pot you use and how weak or strong your stove is.\n\n1. Boil water first.\n2. Gently lower in **fridge-cold** eggs.\n3. Lower the heat slightly – so the eggs don’t crack due to being bashed around but water is still at a gentle boil.\n4. Start the timer – 6 minutes for runny yolks, 8 minutes for soft boiled, 10 minutes for classic hard boiled, 15 minutes for unpleasant rubbery whites and powdery dry yolks.\n5. Transfer into a large bowl or sink of cold water.\n6. Peel under water starting from the base (it’s easier).\n\nAnd that’s all you need to know. But if you’re wondering about the _why_, read on! \n\n## How long to boil eggs\n\n* Dippy eggs and soldiers – 3 minutes (can’t peel)\n* Runny yolks – 6 minutes\n* Soft boiled – 8 minutes\n* Hard boiled – 10 minutes\n\nRemember, lower fridge-cold eggs into boiling water **_then_** start the timer!\n\nBoil water first then put the eggs in\n\nCrack the shell and peel from the base\n\n## My egg boiling rules & the why\n\n1. **Boil water before adding eggs** – Your water boils faster than mine, because you have a better pot and stronger stove. So if we both start with eggs in cold water then bring it to a boil, our egg cook times will be different.  \nPlus, at what point _really_ do you consider the water to be boiling so at what point do you start the timer? And who wants to stand over a pot, waiting for that exact moment it comes to a boil so you can start the timer? Remove that variable! _Always start your eggs in boiling water._\n2. **Lower heat slightly once eggs are added** – So the eggs aren’t bashed around so they crack. But keep the water at a gentle boil / rapid simmer else you will lose heat. Goal: maximum water bubbling without eggs cracking.\n3. **Fridge-cold eggs** – Insurance policy for creamy / runny yolks, eggs are consistently easier to peel, pls there’s a consistent baseline for everyone boiling eggs. 8 minutes for a room temperature egg = hard boiled, fridge cold egg = soft boiled!\n4. **Egg size** – The egg cook times provided above are for “large eggs” which are sold in cartons labelled as such. “Large eggs” are \\~50 – 55g / 2 oz each, a size prescribed by industry regulations. For other egg sizes:  \n– Extra-large eggs (60g/2.2 oz): add 30 seconds  \n– Jumbo eggs (65g /2.5 oz): add an extra 1 minute  \n– Emu eggs: separate recipe coming one day….. (maybe!😂)\n5. **Don’t crowd the pan** – Small saucepan and too many eggs = not enough heat in the water per egg = slower cook time.\n6. **Saucepan size** – A 18 cm / 7″ saucepan is suitable for 6 eggs, a 16cm / 6″ pan for 4 eggs.\n7. **Save ice for cocktails** – Ice is precious around these parts. There’s no need to waste them on your morning eggs! A bowl of cold tap water is enough to stop the cooking process.\n8. **Peel from the base** – It’s easier. Try it.\n9. **Peel under water** – Also easier. Try it!\n\n## What type of boiled eggs I use for what\n\n1. **Dippy eggs for soldiers (3 minutes)** – Made for dipping in toast sticks (pictured above), these cannot be peeled as only the outer rim of the whites are set. The yolks are runny as is the inner layer of egg whites, so you can mix it up and dip the bread sticks in.\n2. **Runny yolks** (6 minutes) **–** I don’t use these very often because they are a bit of a pain to peel because the egg whites are just barely set so they are rather delicate! Usually if I’m after a runny yolk I’ll do  (such as for ) or fried eggs sunny-side up (for ). Just easier to handle and cook, I find.  \n**What I use them for –**  and on toast with avocado in some form (smashed/smeared,  or ).\n3. **Soft boiled eggs** ⭐️(8 minutes) **–** My favourite and default boiled egg because it is at its best! Cooked so the yolk is just set which means it is at its optimal creaminess. But the yolk is cooked enough so it doesn’t run when you cut it.  \n**What I use them for –** salads (, , ), studded throughout  and for my favourite .\n4. **Hard boiled eggs** (10 minutes) – The other alternative level of doneness for the above listed salads. I prefer soft boiled rather than hard boiled simply because the yolks are creamier and the whites are softer.\n5. **Overcooked eggs** (12 minutes+) – Powdery yolks and rubbery whites are not to my taste, but do your eggs as you wish! I just hope nobody is aiming for the dreaded grey ring around the yolk. That’s as overcooked as you can get!\n\nSoft boiled eggs with \n\n## Egg cracking problems?\n\nTo prevent eggs cracking:\n\n1. Lower the eggs in gently using a slotted spoon or similar – don’t drop them in from a height!\n2. Reduce the heat slightly as soon as the eggs are added so the water isn’t bubbling so furiously that the eggs are thrown around so violently that they crack.\n\nThe other thing that can cause egg cracking is thin shells. The thickness of shells varies which can come down to the chicken breed and the quality of the chickens – and therefore the eggs. Do you use free range eggs?\n\n## Crater eggs\n\nAs for the burning question about why some eggs peel neatly and others end up cratered like the moon? Ahh, so much information out there! The only thing I know for sure is that older eggs peel more neatly than fresh eggs. This is simply because the membrane of freshly laid eggs is adhered more firmly to the shell so it’s harder to peel off. The older the egg, the more that membrane degrades = easier to peel.\n\nI find eggs purchased from the store that I’ve had for a week+ in the fridge almost always peel neatly. \n\nFresh eggs do not peel as neatly as older eggs\n\n## And onwards!\n\nAnd that, my friends, is all the pertinent information I have to impart on the matter of boiling eggs. Go forth and enjoy your new egg boiling life, with guaranteed perfectly boiled eggs every single time!\n\nAnd for egg boiling experts – _share your tips._ I love learning new things! **_– Nagi x_**\n\n---\n\n## Watch how to make it\n\n Subscribe to my  and follow along on ,  and  for all of the latest updates.\n\n**Recipe video above.** This method of boiling eggs will produce consistent results to your desired level of doneness, every time! \n\n**Top tips:** fridge cold eggs (creamy yolks insurance), bring water to boil first, then add eggs and start the timer. Starting from cold water causes too many variables and inconsistent results, plus eggs put into boiling water are easier to peel. Use a saucepan large enough so the eggs are in a single layer with space in between (Note 1).\n\n* ▢ , fridge cold (55g/2oz each, Note 2)\n\n* **Water level 3cm/1\"** – Fill the saucepan with enough water so it will cover the eggs by 3cm / 1\" or more.\n* **Boil first then add eggs** – Bring to a rapid boil over high heat. Using a slotted spoon, gently lower fridge-cold eggs into the water.\n* **Lower heat –** Reduce the heat slightly to medium high – water should still be bubbling but not so much the eggs are being bashed around so roughly they crack. (Note 3)\n* **Start the timer** once all the eggs are in.  \n– Dippy solders: 3 minutes (can't peel)  \n– Runny yolks: 6 minutes  \n– Soft boiled: 8 minutes  \n– Hard boiled: 10 minutes\n* **Cool 10 minutes** – Remove eggs using a slotted spoon into a large bowl or sink filled with plenty of cold tap water to cool the eggs. (Ice – Note 4) Cool 10 minutes.\n* **Peel from base in water** – Crack the base of the shell by tapping it on the counter, then peel under water from the base (it's easier).\n* **Storing** – Hard boiled eggs can be stored in the fridge for up to 7 days (peeled or unpeeled). Freezing not recommended (whites go weird).\n\n### **Egg doneness**\n\nStart timer once eggs put into boiling water**:**\n\n* **Dippy soldiers (3 min)** – Made for dipping toast stick in (see photo in post). Only outer rim of whites set. Can’t be peeled.\n* **Runny yolks (6 min)** – Barely set whites, runny yolk. Delicate to peel. For runny yolks I usually do  or sunny-side up.\n* **Soft boiled (8 min)** _my favourite_ – Soft set but fully cooked whites, fully set yolks but a bit jammy. My favourite / most used.\n* **Hard boiled (10 min)** – Firmer whites and fully cooked yolks but not dried out.\n* **Overcooked (15 min)** – No! Unpleasantly firm rubbery whites and powdery dry yolks.\n\n---\n\n**1\\. Don’t crowd the eggs**, they will take longer to cook! Saucepan size for number of eggs: 16cm/6″ – up to 4 eggs 18cm/7″ – 6 eggs More eggs = larger pot\n\n**2\\. Egg size –** Eggs are sold in different sizes. The cook times provided in the recipe are for large eggs (55g/2oz each in the shell), sold in cartons labelled as such. For extra-large eggs (60g/2.2oz) add 30 seconds, for jumbo eggs (65g/2.5oz) add 1 minute.\n\n**3\\. Egg cracking –** Lower heat as needed to prevent eggs from cracking but goal is to keep it at a gentle boil / rapid simmer. If the water is still, there is not enough heat and your eggs are not cooking fast enough! Still got cracking issues? Thin shells is a problem (are you using free range?) and sometimes eggs already have a hairline fracture (can be invisible).\n\n**4\\. Ice water** – there’s no need to waste precious ice for the water though if you have an abundance of ice, feel free to go ahead as it will speed up the cooling time. Just be sure to use enough tap water to cool the eggs.\n\n**Nutrition** per egg.\n\nCalories: 63cal (3%)Carbohydrates: 0.3gProtein: 6g (12%)Fat: 4g (6%)Saturated Fat: 1g (6%)Polyunsaturated Fat: 1gMonounsaturated Fat: 2gTrans Fat: 0.02gCholesterol: 164mg (55%)Sodium: 62mg (3%)Potassium: 61mg (2%)Sugar: 0.2gVitamin A: 238IU (5%)Calcium: 25mg (3%)Iron: 1mg (6%)\n\nKeywords: hard boiled eggs, how to boil eggs, soft boiled eggs\n\n## Life of Dozer\n\nSize context: large eggs and jumbo paws.\n\nI believe you can make great food with everyday ingredients even if you’re short on time and cost conscious. You just need to cook clever and get creative!\n\n### Free Recipe eBooks\n\n Join my free email list to receive THREE free cookbooks! \n\n## Reader Interactions","How to Make Hard Boiled Eggs - Love and Lemons \n\nLearn how to make hard boiled eggs perfectly every time! With this easy method, they'll be easy to peel and have vibrant yellow yolks.\n\nHere’s the good news: perfect hard boiled eggs are easy to make. …And the bad news: so are less-than-perfect ones. I don’t know about you, but I’ve certainly cooked my fair share of the latter. When you try to peel away the shell, half the whites come along with it, or when you cut it open, the yolk is slightly green instead of brilliant yellow. Pretty disappointing, if you ask me.\n\nSee, cooking perfect hard boiled eggs is easy, but that doesn’t mean that the process you use doesn’t matter. After years of trial and error, I’m happy to say that this method for how to make hard boiled eggs works every time! The yolks are always sunshine yellow, and the shells slide right off. Whether you’re getting ready for Easter, prepping for Passover, or just on the hunt for a protein-packed snack, this easy hard boiled egg recipe is guaranteed to please.\n\nFollow these simple steps to make perfect hard boiled eggs every time:\n\n**First, boil the eggs.** Place them in a pot and cover them with cold water by 1 inch. Bring the water to a boil over high heat.\n\n**Then, let them sit in the hot water.** As soon as the water begins to boil, turn off the heat and cover the pot. Leave the eggs in the hot water for anywhere from 10-12 minutes, depending on how you like your eggs. The 10-minute eggs will have vibrant, creamy yolks, while the 12-minute yolks will be paler and opaque, with a chalkier texture.\n\n**Finally, move them to an ice bath.** When the time is up, drain the eggs and transfer them to a large bowl of ice water to stop the cooking process. Leave them in the ice bath for at least 14 minutes before you peel the eggs.\n\nIf you’re not planning to eat the eggs right away, feel free to leave them in the shells and store them in the fridge. But even if this is the case, don’t cut the ice bath short! It’s crucial for stopping the cooking process and making the eggs easy to peel later on.\n\n_See below for the complete recipe!_\n\n## Perfect Hard Boiled Eggs Tips\n\n* **Buy the eggs in advance.** If I’m cooking , fresh eggs will yield the best results every time. But if I’m hard boiling them, the opposite is true! Boiled farm-fresh eggs are more difficult to peel than older eggs. If you want to make perfect hard boiled eggs, it pays to buy them in advance and cook them after a few days in the fridge.\n* **Store the eggs upside down.** This tip comes from Jack’s mom, who makes the BEST  for family gatherings. In order for the yolks to land right in the center of the hard boiled eggs, she recommends storing the raw eggs upside down before you cook them.\n* **Don’t skip the ice bath!** Overcooked hard boiled eggs have an unappealing greenish ring around the yolks. We want our yolks to come out sunshine-yellow, so transfer the eggs to an ice bath to stop the cooking process as soon as they come out of the pot. This step is also crucial for making hard boiled eggs that are easy to peel. The ice bath helps separate the egg membrane from the shell, so you’ll be able to peel away the shell without ripping off chunks of egg white.\n* **Peel them carefully.** The ice bath should set you up for success here, but that doesn’t mean the shell will all come off in one piece. Gently rap the egg on the counter to break the entire shell into small pieces. Carefully peel it away along the fractures, leaving the egg whites as intact as possible.\n\n## Storing and Serving Suggestions\n\nPeeled or unpeeled hard boiled eggs will keep in the refrigerator for up to 5 days. Enjoy them as a protein-packed snack with salt and pepper or , slice them into salads, add them to grain bowls, or top them onto . I also love to make hard boiled eggs to turn into , , or !\n\nHow do you like to eat hard boiled eggs? Let me know in the comments!\n\n## How to Make Hard Boiled Eggs\n\nPrep Time: 5 minutes \n\nCook Time: 15 minutes \n\nChilling Time: 15 minutes \n\nTotal Time: 35 minutes \n\nThis easy method for how to hard boil eggs works every time! They're easy to peel, and they have perfect yellow yolks. Enjoy them as a snack, add them to salads, and more!\n\n* Place eggs in a  and cover with cold water by 1 inch. Bring to a boil, then cover the pot and turn off the heat. Let the eggs cook, covered, for 9 to 12 minutes, depending on your desired done-ness (see photo).\n* Transfer the eggs to  of ice water and chill for 14 minutes. This makes the eggs easier to peel. Peel and enjoy!\n\n\\*Eggs may vary based on size, type, and freshness. Farm-fresh eggs are more difficult to peel than older eggs. "]

      runInAction(() => {
        this.markdowns = markdowns;
        this.summaryRaw = '';
      });

      console.log('making summary', markdowns);
      runInAction(() => {
        this.statusText = 'Reading pages ...';
        this.summaryInProgress = true;
      });

      const summaryRaw = await makeSummaryWebLLM(this.query, markdowns, action((text) => {
        this.statusText = null;
        this.summaryRaw += text;
      }));

      console.log('summary', summaryRaw);
      runInAction(() => {
        this.summaryInProgress = false;
        this.statusText = null;
      });
      return {
        searchResults,
        markdowns,
        summaryRaw
      }
    } catch (e) {
      // cleanup
      runInAction(() => {
        this.scrapedSites = [];
        this.markdowns = [];
        this.summaryRaw = '';
        this.searchResultsUrls = [];
        this.statusText = null;

        this.summaryInProgress = false
      });

      // rethrow
      throw e;
    }
  }
}

export const {
  useStore: useSearchStore,
  Provider: SearchProvider
} = createContext(SearchStore)

// @ts-ignore
window.toJS = toJS;