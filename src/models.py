import uuid
import random
import os

class Player:
    def __init__(self, session_id, username, is_admin=False):
        self.session_id = session_id 
        self.username = username
        self.score = 0
        self.is_admin = is_admin

    def to_dict(self):
        return {
            "pid": self.session_id,
            "username": self.username,
            "score": self.score,
            "is_admin": self.is_admin
        }

    def __repr__(self):
        return f"<Player {self.username} (Admin: {self.is_admin})>"

class Game:
    WORDS = []

    @staticmethod
    def load_words(filename="words.txt"):
        if not os.path.exists(filename):
            raise FileNotFoundError(f"ERROR: The file '{filename}' was not found. Please create it in the root directory.")

        try:
            with open(filename, "r", encoding="utf-8") as f:
                words = [line.strip() for line in f if line.strip()]
            
            if not words:
                raise ValueError(f"ERROR: The file '{filename}' exists but is empty.")
                
            print(f"Successfully loaded {len(words)} words from {filename}.")
            return words
            
        except Exception as e:
            # Catch other permission/read errors and crash
            raise RuntimeError(f"ERROR: Could not read '{filename}': {e}")

    def __init__(self):
        self.id = str(uuid.uuid4())[:4].upper()
        self.creator_sid = None
        self.players: dict[str, Player] = {}
        self.is_game_active = False
        self.current_drawer = None
        self.current_word = ""
        self.guessed_players = set()

    def add_player(self, player: Player):        
        if (player.is_admin and any(p.is_admin for p in self.players.values())):
            player.is_admin = False
            
        self.players[player.session_id] = player
    
    def remove_player(self, session_id):
        if session_id in self.players:
            del self.players[session_id]

    def get_all_players(self):
        return [p.to_dict() for p in self.players.values()]

    def start_new_round(self):
        player_list = list(self.players.values())

        if len(player_list) < 2:
            return None

        self.is_game_active = True
        self.guessed_players.clear()

        self.current_drawer = random.choice(player_list)
        self.current_word = random.choice(self.WORDS)

        return {
            "drawer": self.current_drawer.username,
            "drawer_id": self.current_drawer.session_id,
            "word": self.current_word
        }

    def process_guess(self, session_id, guess_text):
        if not self.is_game_active:
            return None

        if self.current_drawer and session_id == self.current_drawer.session_id:
            return None 

        clean_guess = guess_text.strip().lower()
        target_word = self.current_word.lower()

        if clean_guess == target_word:
            winner = self.players[session_id]
            winner.score += 10
            self.is_game_active = False
            
            return {
                "type": "ROUND_WIN",
                "winner": winner.username,
                "word": self.current_word
            }

        return {"type": "CHAT_MESSAGE", "message": guess_text}
    
Game.WORDS = Game.load_words()