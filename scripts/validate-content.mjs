const categories = [70,60,100,150,100,120,100,140,80,70,70,70,60,50,50,60,60,50,80,80];
const total = categories.reduce((a,b)=>a+b,0);
if (categories.length !== 20) throw new Error(`Expected 20 categories, got ${categories.length}`);
if (total !== 1620) throw new Error(`Expected 1620 questions, got ${total}`);
console.log(`Capital Forge content OK: ${categories.length} categories / ${total} questions.`);
