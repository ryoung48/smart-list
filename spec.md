# 🛒 Grocery App – Product Specification (v2)

---

## 1. **Overview**

A smart grocery app that **automatically learns recurring shopping items** by analyzing past completed lists. Instead of manually creating a new list from scratch, the app **pre-populates items** it predicts the user will need, based on historical patterns.

Users simply “finish” lists when shopping, and the app improves its predictions over time.

---

## 2. **Core Features**

### ✅ Smart List Creation

* New list auto-populates with **predicted items** based on past shopping patterns.
* User can easily add or remove items.
* Suggestions grouped into:

  * **High Confidence**: Almost always purchased.
  * **Occasional**: Sometimes purchased.

### 🛒 Finishing Lists

* **In-store flow**: Check off items as they are bought.
* **Quick Finish**: Tap “Finish List” → all items marked as purchased.
* **Partial Finish**: Before finalizing, user can uncheck any items not bought.
* Finished list is archived in history → used to improve predictions.

### 🤖 Predictive Engine

* Learns recurrence by analyzing **frequency of items** across lists of the same type.
* Calculates a **confidence score** for each item (based on reappearance rate & interval consistency).
* Items with higher scores are added automatically to future lists.
* Items arranged by store layout, learned from check-off patterns

### 👥 Collaboration

* Share lists with family/roommates.
* Real-time sync: when one person checks an item, others see it instantly.
* Finished lists are synced across all collaborators.

### 📱 UX Details

* Simple, fast UI optimized for one-hand use in-store.
* Categories (Produce, Dairy, Pantry, etc.) help organize items.

---

## 3. **Advanced Features (Future Scope)**

* **Decay Logic**: Items that stop appearing for several weeks fade from predictions.
* **Recipe Integration**: Suggest recipes and auto-generate ingredient lists.
* **Voice Input**: Add items via voice.

---

## 5. **Data Models (Revised)**

```sql
  -- Lists table
  CREATE TABLE lists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'grocery',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ
  );

  -- Items table  
  CREATE TABLE items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    list_id UUID REFERENCES lists(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    checked_at TIMESTAMPTZ,
    predicted BOOLEAN DEFAULT FALSE,
    confidence TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Item predictions table
  CREATE TABLE item_predictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    confidence TEXT NOT NULL,
    frequency INTEGER DEFAULT 1,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name, category)
  );

---

## 6. **User Flows**

### 🛒 Create a New List

1. User taps “New Weekly Grocery List.”
2. App auto-fills with predicted items (Milk, Bread, Eggs).
3. User adds/removes as needed.

### ✅ Finish a List

1. User checks off items while shopping OR taps **“Finish List.”**
2. Any unchecked items are flagged as “not purchased.”
3. List is archived in history → updates recurrence learning.

### 🤖 Prediction Example

* Week 1: List includes Milk, Bread, Apples.
* Week 2: List includes Milk, Bread, Bananas.
* Week 3: New list auto-fills: Milk, Bread.

  * Apples appear occasionally → suggested in “Low Confidence.”
  * Bananas also suggested if pattern continues.

---

## 7. **MVP vs. Later Versions**

**MVP (1.0)**

* Smart auto-filled lists based on history
* Finish lists (check off or bulk finish)
* Local storage persistence
* Simple prediction logic (frequency-based)

**Later Versions**

* Cloud sync + family sharing
* Advanced AI-powered predictions
* Price tracking & budgeting
* Recipe → grocery list automation

---

⚡ **Key Differentiator**:
Unlike other list apps, this app **requires minimal setup**. Users never tag items as recurring — the app learns passively and gets smarter every time a list is finished.

---