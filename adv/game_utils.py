import json
import os

# ゲームの状態を保存する関数
def save_game(current_scene, game_state, save_file="save.json"):
    save_data = {
        "current_scene": current_scene,
        "game_state": game_state
    }
    
    with open(save_file, "w", encoding="utf-8") as file:
        json.dump(save_data, file, ensure_ascii=False, indent=4)
    
    return True

# ゲームの状態を読み込む関数
def load_game(save_file="save.json"):
    if not os.path.exists(save_file):
        return None, None
    
    try:
        with open(save_file, "r", encoding="utf-8") as file:
            save_data = json.load(file)
        
        return save_data.get("current_scene"), save_data.get("game_state")
    except:
        return None, None

# シーンエディタ - 新しいシーンを追加/編集する関数
def edit_scene(scenes, scene_id, text, choices, background=None):
    scenes[scene_id] = {
        "text": text,
        "choices": choices,
        "background": background
    }
    return scenes

# シーンをファイルに保存する関数
def save_scenes(scenes, file_path="scenes.json"):
    with open(file_path, "w", encoding="utf-8") as file:
        json.dump(scenes, file, ensure_ascii=False, indent=4)
    
    return True

# 条件付き選択肢を処理する関数
def process_conditional_choices(choices, game_state):
    valid_choices = []
    
    for choice in choices:
        # 条件がない場合、または条件が満たされている場合
        if "condition" not in choice or check_condition(choice["condition"], game_state):
            valid_choices.append(choice)
    
    return valid_choices

# 条件をチェックする関数
def check_condition(condition, game_state):
    # 条件の例: {"type": "has_item", "item": "key"}
    # または {"type": "has_flag", "flag": "talked_to_villager"}
    
    if condition["type"] == "has_item":
        return condition["item"] in game_state.get("inventory", [])
    
    elif condition["type"] == "has_flag":
        return game_state.get("flags", {}).get(condition["flag"], False)
    
    # その他の条件タイプを追加可能
    
    return False

# アイテムを追加する関数
def add_item(game_state, item):
    if "inventory" not in game_state:
        game_state["inventory"] = []
    
    if item not in game_state["inventory"]:
        game_state["inventory"].append(item)
    
    return game_state

# フラグを設定する関数
def set_flag(game_state, flag, value=True):
    if "flags" not in game_state:
        game_state["flags"] = {}
    
    game_state["flags"][flag] = value
    
    return game_state
