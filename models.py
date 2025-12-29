import uuid
import random

class Player:
    def __init__(self, session_id, username, is_admin=False):
        self.session_id = session_id  # The unique socket ID for this connection
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
    """Class representating a single drawing and guessing game session."""

    WORDS = [
        "araba", "bilgisayar", "telefon", "uçak", "helikopter",
        "gemi", "bisiklet", "motosiklet", "tren", "otobüs",
        "kedi", "köpek", "fil", "zürafa", "aslan",
        "kaplan", "ayı", "tavşan", "balık", "kuş",
        "elma", "armut", "muz", "çilek", "karpuz",
        "pizza", "hamburger", "dondurma", "pasta", "ekmek",
        "ev", "okul", "hastane", "köprü", "cami",
        "kale", "çadır", "apartman", "fabrika", "stadyum",
        "gözlük", "saat", "ayakkabı", "şapka", "çanta",
        "kamera", "televizyon", "radyo", "gitar", "piyano",
        "doktor", "polis", "itfaiyeci", "öğretmen", "aşçı",
        "pilot", "ressam", "yüzücü", "futbolcu", "asker",
        "güneş", "ay", "yıldız", "bulut", "yağmur",
        "kar", "şimşek", "gökkuşağı", "deniz", "dağ"
    ]

    def __init__(self):
        self.id = str(uuid.uuid4())[:4].upper()  # Simple short ID
        self.creator_sid = None
        self.players: dict[str, Player] = {}  # session_id: Player
        self.is_game_active = False
        self.current_drawer = None
        self.current_word = ""
        self.guessed_players = set()

    def add_player(self, player: Player):
        """Oyuna yeni bir oyuncu ekler."""
        
        if (player.is_admin and any(p.is_admin for p in self.players.values())):
            player.is_admin = False
            
        self.players[player.session_id] = player
    
    def remove_player(self, session_id):
        """Oyuncuyu oyundan çıkarır."""
        if session_id in self.players:
            del self.players[session_id]

    def get_all_players(self):
        """Frontend'e göndermek için oyuncu listesini döndürür."""
        return [p.to_dict() for p in self.players.values()]

    def start_new_round(self):
        """Yeni bir tur başlatır: Çizen ve Kelime seçer."""
        player_list = list(self.players.values())

        # Mantıken en az 2 kişi lazım, yoksa oyun başlamaz
        if len(player_list) < 2:
            return None  # Veya hata fırlatabiliriz

        self.is_game_active = True
        self.guessed_players.clear()

        # 1. Rastgele Çizen Seç (İleride sırayla yapılabilir, şimdilik rastgele)
        self.current_drawer = random.choice(player_list)

        # 2. Rastgele Kelime Seç
        self.current_word = random.choice(self.WORDS)

        return {
            "drawer": self.current_drawer.username,
            "drawer_id": self.current_drawer.session_id,
            "word": self.current_word
        }

    def process_guess(self, session_id, guess_text):
        if not self.is_game_active:
            return None

        # Check if message is from the drawer (prevent cheating/spoiling)
        if self.current_drawer and session_id == self.current_drawer.session_id:
            return None 

        clean_guess = guess_text.strip().lower()
        target_word = self.current_word.lower()

        if clean_guess == target_word:

            winner = self.players[session_id]
            winner.score += 10
            self.is_game_active = False # End the round immediately
            
            return {
                "type": "ROUND_WIN",
                "winner": winner.username,
                "word": self.current_word
            }

        # Treat as chat message
        return {"type": "CHAT_MESSAGE", "message": guess_text}
