from models import Game

class GameManager:
    def __init__(self):
        self.games = {}  # game_id: Game

    def create_game(self):
        """Yeni bir oyun oluştur ve ID'sini döndür."""
        new_game = Game()
        self.games[new_game.game_id] = new_game
        return new_game.game_id

    def get_game(self, game_id):
        """Belirli bir oyun ID'sine ait oyunu döndür."""
        return self.games.get(game_id.upper())

    def delete_game(self, game_id):
        """Oyun sona erdikten sonra sil."""
        if game_id in self.games:
            del self.games[game_id]
