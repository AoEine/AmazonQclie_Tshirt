import pygame
import sys
import json
import os

# ゲームの初期化
pygame.init()
WIDTH, HEIGHT = 800, 600
INVENTORY_HEIGHT = 80  # インベントリエリアの高さ
GAME_HEIGHT = HEIGHT - INVENTORY_HEIGHT  # ゲーム画面の高さ
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("フクロウの冒険")

# 主人公の画像を読み込む
PROTAGONIST_IMAGE_PATH = "/Users/yumaspr/Desktop/MakeGame/AmazonQChallenge250618/adv/bird_fukurou_run.png"
protagonist_image = None
try:
    if os.path.exists(PROTAGONIST_IMAGE_PATH):
        protagonist_image = pygame.image.load(PROTAGONIST_IMAGE_PATH)
        # 適切なサイズに調整（必要に応じて調整）
        protagonist_image = pygame.transform.scale(protagonist_image, (150, 150))
except Exception as e:
    print(f"主人公の画像を読み込めませんでした: {e}")

# 色の定義
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
GRAY = (200, 200, 200)
DARK_GRAY = (100, 100, 100)
LIGHT_GRAY = (240, 240, 240)
BLUE = (100, 150, 255)
GREEN = (100, 255, 100)
RED = (255, 100, 100)
YELLOW = (255, 255, 100)

# フォントの設定
# 日本語フォントを使用
try:
    # macOSの場合
    title_font = pygame.font.Font("/System/Library/Fonts/ヒラギノ角ゴシック W4.ttc", 48)
    text_font = pygame.font.Font("/System/Library/Fonts/ヒラギノ角ゴシック W4.ttc", 28)
    choice_font = pygame.font.Font("/System/Library/Fonts/ヒラギノ角ゴシック W4.ttc", 32)
    inventory_font = pygame.font.Font("/System/Library/Fonts/ヒラギノ角ゴシック W4.ttc", 20)
except:
    try:
        # Windowsの場合
        title_font = pygame.font.Font("C:/Windows/Fonts/msgothic.ttc", 48)
        text_font = pygame.font.Font("C:/Windows/Fonts/msgothic.ttc", 28)
        choice_font = pygame.font.Font("C:/Windows/Fonts/msgothic.ttc", 32)
        inventory_font = pygame.font.Font("C:/Windows/Fonts/msgothic.ttc", 20)
    except:
        # フォントが見つからない場合はデフォルトのフォントを使用
        print("日本語フォントが見つかりませんでした。デフォルトフォントを使用します。")
        title_font = pygame.font.SysFont(None, 48)
        text_font = pygame.font.SysFont(None, 28)
        choice_font = pygame.font.SysFont(None, 32)
        inventory_font = pygame.font.SysFont(None, 20)

# ゲームの状態
current_scene = "start"
game_state = {
    "inventory": None,  # 1つのアイテムのみ保持
    "flags": {},
    "last_click_time": 0,  # 最後のクリック時間
    "scene_transition_time": 0,  # シーン遷移時間
    "click_cooldown": 300,  # クリック間隔（ミリ秒）
    "scene_cooldown": 500   # シーン遷移後の待機時間（ミリ秒）
}

# アイテムクラス
class Item:
    def __init__(self, name, color, description=""):
        self.name = name
        self.color = color
        self.description = description
    
    def __str__(self):
        return self.name

# クリック可能なアイテムクラス
class ClickableItem:
    def __init__(self, item, x, y, width, height):
        self.item = item
        self.rect = pygame.Rect(x, y, width, height)
        self.is_collected = False
    
    def draw(self, surface):
        if not self.is_collected:
            pygame.draw.rect(surface, self.item.color, self.rect)
            pygame.draw.rect(surface, BLACK, self.rect, 2)
            # アイテム名を描画
            text_surf = inventory_font.render(self.item.name, True, BLACK)
            text_rect = text_surf.get_rect(center=self.rect.center)
            surface.blit(text_surf, text_rect)
    
    def is_clicked(self, pos):
        return self.rect.collidepoint(pos) and not self.is_collected

# シーンデータの読み込み
def load_scenes():
    try:
        with open("scenes.json", "r", encoding="utf-8") as file:
            return json.load(file)
    except FileNotFoundError:
        # デフォルトのシーンを返す（アイテム付き）
        return {
            "start": {
                "text": "冒険の始まり。あなたは森の入り口に立っています。地面に光る石が落ちています。どうしますか？",
                "choices": [
                    {"text": "森に入る", "next": "forest"},
                    {"text": "村に戻る", "next": "village"}
                ],
                "background": None,
                "items": [
                    {"name": "光る石", "color": [100, 150, 255], "x": 100, "y": 200, "width": 60, "height": 30}
                ]
            },
            "forest": {
                "text": "深い森の中に入りました。木々が密集していて、少し不気味です。前方に小道が見えます。木の根元に赤いキノコが生えています。",
                "choices": [
                    {"text": "小道を進む", "next": "path"},
                    {"text": "森の入り口に戻る", "next": "start"}
                ],
                "background": None,
                "items": [
                    {"name": "赤キノコ", "color": [255, 100, 100], "x": 150, "y": 250, "width": 50, "height": 40}
                ]
            },
            "village": {
                "text": "村に戻ってきました。村人たちが日常の生活を送っています。井戸の近くに古いコインが落ちています。",
                "choices": [
                    {"text": "宿屋に行く", "next": "inn"},
                    {"text": "森に向かう", "next": "start"}
                ],
                "background": None,
                "items": [
                    {"name": "古いコイン", "color": [255, 255, 100], "x": 200, "y": 180, "width": 40, "height": 40}
                ]
            },
            "path": {
                "text": "小道を進むと、古い小屋が見えてきました。道端に緑の宝石が輝いています。",
                "choices": [
                    {"text": "小屋に入る", "next": "cabin"},
                    {"text": "森に戻る", "next": "forest"}
                ],
                "background": None,
                "items": [
                    {"name": "緑の宝石", "color": [100, 255, 100], "x": 300, "y": 220, "width": 45, "height": 35}
                ]
            },
            "inn": {
                "text": "宿屋に入りました。暖かい暖炉と美味しそうな食事の匂いがします。テーブルの上に銀のスプーンがあります。",
                "choices": [
                    {"text": "食事をする", "next": "eat"},
                    {"text": "村に戻る", "next": "village"}
                ],
                "background": None,
                "items": [
                    {"name": "銀スプーン", "color": [200, 200, 200], "x": 250, "y": 190, "width": 55, "height": 25}
                ]
            },
            "cabin": {
                "text": "小屋の中は埃っぽく、長い間誰も住んでいないようです。テーブルの上に古い地図があります。",
                "choices": [
                    {"text": "地図を調べる", "next": "map"},
                    {"text": "小屋を出る", "next": "path"}
                ],
                "background": None,
                "items": [
                    {"name": "古い地図", "color": [139, 69, 19], "x": 180, "y": 160, "width": 70, "height": 50}
                ]
            },
            "eat": {
                "text": "美味しい食事を取りました。体力が回復した気がします。",
                "choices": [
                    {"text": "宿屋を出る", "next": "village"}
                ],
                "background": None,
                "items": []
            },
            "map": {
                "text": "地図には宝の在り処が記されているようです！冒険の新たな目標ができました。",
                "choices": [
                    {"text": "地図を持って小屋を出る", "next": "path_with_map"}
                ],
                "background": None,
                "items": []
            },
            "path_with_map": {
                "text": "地図を手に入れて森の小道に戻りました。これからどこへ向かいますか？",
                "choices": [
                    {"text": "地図に従って進む", "next": "treasure"},
                    {"text": "森に戻る", "next": "forest"}
                ],
                "background": None,
                "items": []
            },
            "treasure": {
                "text": "地図に従って進むと、古代の遺跡にたどり着きました。入り口には謎めいた文字が刻まれています。",
                "choices": [
                    {"text": "遺跡に入る", "next": "ruins"},
                    {"text": "森に戻る", "next": "forest"}
                ],
                "background": None,
                "items": []
            },
            "ruins": {
                "text": "遺跡の中は神秘的な光に満ちています。中央には宝箱が置かれています。",
                "choices": [
                    {"text": "宝箱を開ける", "next": "ending"},
                    {"text": "遺跡を出る", "next": "treasure"}
                ],
                "background": None,
                "items": []
            },
            "ending": {
                "text": "宝箱を開けると、まばゆい光が溢れ出しました。あなたは伝説の宝を手に入れました！冒険は成功です！",
                "choices": [
                    {"text": "もう一度プレイする", "next": "start"}
                ],
                "background": None,
                "items": []
            }
        }

# インベントリを描画する関数
def draw_inventory():
    # インベントリ背景
    inventory_rect = pygame.Rect(0, GAME_HEIGHT, WIDTH, INVENTORY_HEIGHT)
    pygame.draw.rect(screen, LIGHT_GRAY, inventory_rect)
    pygame.draw.rect(screen, BLACK, inventory_rect, 2)
    
    # インベントリタイトル
    title_text = inventory_font.render("インベントリ", True, BLACK)
    screen.blit(title_text, (10, GAME_HEIGHT + 5))
    
    # アイテムスロット
    slot_rect = pygame.Rect(10, GAME_HEIGHT + 25, 50, 50)
    pygame.draw.rect(screen, WHITE, slot_rect)
    pygame.draw.rect(screen, BLACK, slot_rect, 2)
    
    # アイテムがある場合は描画
    if game_state["inventory"]:
        pygame.draw.rect(screen, game_state["inventory"].color, slot_rect)
        pygame.draw.rect(screen, BLACK, slot_rect, 2)
        # アイテム名を表示
        item_text = inventory_font.render(game_state["inventory"].name, True, BLACK)
        screen.blit(item_text, (70, GAME_HEIGHT + 35))
    else:
        # 空のスロット表示
        empty_text = inventory_font.render("空", True, GRAY)
        text_rect = empty_text.get_rect(center=slot_rect.center)
        screen.blit(empty_text, text_rect)

# アイテムを収集する関数
def collect_item(new_item):
    old_item = game_state["inventory"]
    game_state["inventory"] = new_item
    return old_item

# シーンのアイテムを管理するクラス
class SceneItems:
    def __init__(self):
        self.items = {}  # scene_id: [ClickableItem, ...]
    
    def load_scene_items(self, scene_id, scene_data):
        if scene_id not in self.items:
            self.items[scene_id] = []
            if "items" in scene_data:
                for item_data in scene_data["items"]:
                    item = Item(item_data["name"], item_data["color"])
                    clickable_item = ClickableItem(
                        item, 
                        item_data["x"], 
                        item_data["y"], 
                        item_data["width"], 
                        item_data["height"]
                    )
                    self.items[scene_id].append(clickable_item)
    
    def get_scene_items(self, scene_id):
        return self.items.get(scene_id, [])
    
    def handle_click(self, scene_id, pos):
        if scene_id in self.items:
            for clickable_item in self.items[scene_id]:
                if clickable_item.is_clicked(pos):
                    # アイテムを収集
                    old_item = collect_item(clickable_item.item)
                    clickable_item.is_collected = True
                    
                    # 古いアイテムがあった場合は同じ場所に配置
                    if old_item:
                        new_clickable = ClickableItem(
                            old_item,
                            clickable_item.rect.x,
                            clickable_item.rect.y,
                            clickable_item.rect.width,
                            clickable_item.rect.height
                        )
                        self.items[scene_id].append(new_clickable)
                    
                    return True
        return False

# グローバルなシーンアイテム管理
scene_items = SceneItems()
# テキストを複数行に分割して描画する関数（日本語対応版）
def draw_text(text, font, color, surface, x, y, max_width):
    # 日本語テキストは単語で分割できないので、1文字ずつ処理
    lines = []
    current_line = ""
    
    for char in text:
        test_line = current_line + char
        # テキストの幅を計算
        test_width = font.size(test_line)[0]
        if test_width < max_width:
            current_line = test_line
        else:
            lines.append(current_line)
            current_line = char
    
    if current_line:  # 最後の行を追加
        lines.append(current_line)
    
    for i, line in enumerate(lines):
        text_surface = font.render(line, True, color)
        surface.blit(text_surface, (x, y + i * font.get_height()))
    
    return y + len(lines) * font.get_height()

# 選択肢ボタンを描画する関数（改良版）
def draw_choice_button(text, x, y, width, height, inactive_color, active_color, action=None):
    mouse = pygame.mouse.get_pos()
    current_time = pygame.time.get_ticks()
    
    # シーン遷移直後やクールダウン中はクリックを無効にする
    can_click = (current_time - game_state["last_click_time"] > game_state["click_cooldown"] and
                current_time - game_state["scene_transition_time"] > game_state["scene_cooldown"])
    
    # マウスがボタンの上にあるかチェック
    is_hovering = x < mouse[0] < x + width and y < mouse[1] < y + height
    
    if is_hovering and can_click:
        pygame.draw.rect(screen, active_color, (x, y, width, height))
        # ホバー時の追加効果
        pygame.draw.rect(screen, BLACK, (x, y, width, height), 3)
    else:
        pygame.draw.rect(screen, inactive_color, (x, y, width, height))
        pygame.draw.rect(screen, BLACK, (x, y, width, height), 2)
        
        # クールダウン中は薄く表示
        if not can_click:
            overlay = pygame.Surface((width, height))
            overlay.set_alpha(128)
            overlay.fill(WHITE)
            screen.blit(overlay, (x, y))
    
    # 日本語テキストのレンダリング
    text_color = BLACK if can_click else GRAY
    text_surf = choice_font.render(text, True, text_color)
    text_rect = text_surf.get_rect(center=(x + width/2, y + height/2))
    screen.blit(text_surf, text_rect)
    
    return action if is_hovering and can_click else None

# クリック処理を管理する関数
def handle_click_event(event):
    """マウスクリックイベントを処理し、適切なタイミングでのみアクションを実行"""
    current_time = pygame.time.get_ticks()
    
    # クールダウン中またはシーン遷移直後はクリックを無視
    if (current_time - game_state["last_click_time"] < game_state["click_cooldown"] or
        current_time - game_state["scene_transition_time"] < game_state["scene_cooldown"]):
        return False
    
    # クリック時間を更新
    game_state["last_click_time"] = current_time
    return True

# シーン遷移を管理する関数
def transition_to_scene(new_scene):
    """シーン遷移時の処理"""
    global current_scene
    current_scene = new_scene
    game_state["scene_transition_time"] = pygame.time.get_ticks()
    print(f"シーン遷移: {new_scene}")  # デバッグ用

# メインゲームループ
def game_loop():
    global current_scene
    scenes = load_scenes()
    clock = pygame.time.Clock()
    
    # 初期化時にシーン遷移時間を設定
    game_state["scene_transition_time"] = pygame.time.get_ticks()
    
    running = True
    clicked_choice = None  # 現在フレームでクリックされた選択肢
    
    while running:
        current_time = pygame.time.get_ticks()
        
        # ゲーム画面をクリア（インベントリエリアを除く）
        game_area = pygame.Rect(0, 0, WIDTH, GAME_HEIGHT)
        pygame.draw.rect(screen, WHITE, game_area)
        
        # 現在のシーンを取得
        scene = scenes.get(current_scene, scenes["start"])
        
        # シーンのアイテムを読み込み
        scene_items.load_scene_items(current_scene, scene)
        
        # 背景画像があれば描画
        if scene.get("background"):
            try:
                bg = pygame.image.load(scene["background"])
                bg = pygame.transform.scale(bg, (WIDTH, GAME_HEIGHT))
                screen.blit(bg, (0, 0))
            except:
                # 背景画像が読み込めない場合は何もしない
                pass
        
        # タイトルを描画
        title_text = "アドベンチャーブック"
        title_surf = title_font.render(title_text, True, BLACK)
        title_rect = title_surf.get_rect(center=(WIDTH/2, 30))
        screen.blit(title_surf, title_rect)
        
        # シーンのテキストを描画
        y_offset = 80
        y_offset = draw_text(scene["text"], text_font, BLACK, screen, 50, y_offset, WIDTH - 100) + 30
        
        # シーンのアイテムを描画
        current_scene_items = scene_items.get_scene_items(current_scene)
        for clickable_item in current_scene_items:
            clickable_item.draw(screen)
        
        # 選択肢を描画
        choice_height = 50
        max_choices_in_game_area = (GAME_HEIGHT - y_offset - 20) // (choice_height + 20)
        
        for i, choice in enumerate(scene["choices"]):
            if i < max_choices_in_game_area:  # ゲームエリア内に収まる選択肢のみ表示
                choice_y = y_offset + i * (choice_height + 20)
                action = draw_choice_button(
                    choice["text"], 
                    WIDTH // 4, 
                    choice_y, 
                    WIDTH // 2, 
                    choice_height, 
                    GRAY, 
                    DARK_GRAY, 
                    choice["next"]
                )
                if action and not clicked_choice:
                    clicked_choice = action
        
        # インベントリを描画
        draw_inventory()
        
        # クールダウン状態の表示（デバッグ用）
        can_click = (current_time - game_state["last_click_time"] > game_state["click_cooldown"] and
                    current_time - game_state["scene_transition_time"] > game_state["scene_cooldown"])
        
        if not can_click:
            cooldown_text = "待機中..."
            cooldown_surf = inventory_font.render(cooldown_text, True, RED)
            screen.blit(cooldown_surf, (WIDTH - 100, 10))
        
        # イベント処理
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False
            elif event.type == pygame.MOUSEBUTTONDOWN:
                if event.button == 1:  # 左クリック
                    if handle_click_event(event):
                        # アイテムクリックの処理
                        if not scene_items.handle_click(current_scene, event.pos):
                            # アイテムがクリックされなかった場合のみ選択肢処理
                            pass
        
        # 選択肢がクリックされた場合のシーン遷移処理
        if clicked_choice:
            transition_to_scene(clicked_choice)
            clicked_choice = None
        
        pygame.display.update()
        clock.tick(60)  # 60 FPS
    
    pygame.quit()
    sys.exit()

# ゲーム開始
if __name__ == "__main__":
    game_loop()
